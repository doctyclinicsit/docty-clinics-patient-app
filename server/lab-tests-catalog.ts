import { importedLabTests } from './lab-tests-imported.js';

export interface LabTestCatalogItem {
  slug: string;
  shortName: string;
  fullName: string;
  category: string;
  sampleType: string;
  description: string;
  whyNeeded: string;
  preparation: string;
  price?: number;
  offerPrice?: number;
  displayOrder: number;
}

type CategoryContent = {
  description: string;
  whyNeeded: string;
};

const categoryOrder = [
  'Popular Tests',
  'Blood Health',
  'Diabetes',
  'Fever & Infection',
  'Thyroid & Hormones',
  'Liver Health',
  'Kidney & Urine',
  'Heart Health',
  'Vitamins & Minerals',
  'Women’s Health',
  'Cancer Markers',
  'Allergy & Immunology',
  'Imaging & Procedures',
  'General Diagnostics',
];

const categoryContent: Record<string, CategoryContent> = {
  'Popular Tests': {
    description: 'A commonly requested diagnostic test used in routine health checks and follow-up visits.',
    whyNeeded: 'Helps the clinician understand your current health status and decide whether further evaluation is needed.',
  },
  'Blood Health': {
    description: 'Assesses blood-related markers such as haemoglobin, cells, platelets, iron status or clotting factors.',
    whyNeeded: 'Useful for screening anaemia, infection clues, inflammation, bleeding risk and general blood health.',
  },
  Diabetes: {
    description: 'Measures blood sugar control or related metabolic markers.',
    whyNeeded: 'Helps screen for diabetes, monitor sugar control and guide lifestyle or treatment decisions.',
  },
  'Fever & Infection': {
    description: 'Looks for infection, immune response or organism-related clues.',
    whyNeeded: 'Helps identify likely causes of fever or infection and supports timely treatment planning.',
  },
  'Thyroid & Hormones': {
    description: 'Measures hormone levels or endocrine-system markers.',
    whyNeeded: 'Helps evaluate thyroid, fertility, growth, adrenal or other hormonal concerns.',
  },
  'Liver Health': {
    description: 'Assesses liver enzymes, proteins, bilirubin or liver-related markers.',
    whyNeeded: 'Helps evaluate liver function, jaundice, medication effects and infection or inflammation affecting the liver.',
  },
  'Kidney & Urine': {
    description: 'Checks kidney function, urine findings or waste products filtered by the kidneys.',
    whyNeeded: 'Useful for urinary symptoms, kidney health monitoring, diabetes follow-up and hydration-related concerns.',
  },
  'Heart Health': {
    description: 'Assesses heart-risk markers, cardiac enzymes, lipids or heart-related procedures.',
    whyNeeded: 'Supports risk assessment and follow-up for cholesterol, chest discomfort, blood pressure or heart-related symptoms.',
  },
  'Vitamins & Minerals': {
    description: 'Measures vitamin, mineral or electrolyte levels.',
    whyNeeded: 'Helps detect deficiencies or imbalances that may affect energy, bones, nerves, immunity and muscle function.',
  },
  'Women’s Health': {
    description: 'Covers pregnancy, fertility, reproductive hormones and women-focused screening tests.',
    whyNeeded: 'Supports evaluation of pregnancy, menstrual concerns, fertility, menopause and preventive screening.',
  },
  'Cancer Markers': {
    description: 'Measures tumour markers or cancer-screening related laboratory values.',
    whyNeeded: 'Used by clinicians for screening support, monitoring or follow-up when clinically appropriate.',
  },
  'Allergy & Immunology': {
    description: 'Assesses allergy response, immune markers or autoimmune-related findings.',
    whyNeeded: 'Helps investigate allergy symptoms, immune conditions and inflammation patterns.',
  },
  'Imaging & Procedures': {
    description: 'A diagnostic imaging or procedure-based investigation.',
    whyNeeded: 'Helps visualise body structures or record body functions when symptoms need imaging-based evaluation.',
  },
  'General Diagnostics': {
    description: 'A diagnostic test used to investigate symptoms, monitor treatment or support preventive care.',
    whyNeeded: 'Helps the clinician correlate your symptoms with objective findings and decide next steps.',
  },
};

const shortNameOverrides: Array<[RegExp, string]> = [
  [/\bacid[- ]?fast bacillus\b|\bafb\b/i, 'AFB'],
  [/\badrenocorticotropic hormone\b|\bacth\b/i, 'ACTH'],
  [/\barterial blood gas\b|\babg\b/i, 'ABG'],
  [/\bbasic metabolic panel\b|\bbmp\b/i, 'BMP'],
  [/\bcomprehensive metabolic panel\b|\bcmp\b/i, 'CMP'],
  [/\bcomplete blood picture\b|\bcbp\b/i, 'CBP'],
  [/\bcomplete blood count\b|\bcbc\b/i, 'CBC'],
  [/\berythrocyte sedimentation rate\b|\besr\b/i, 'ESR'],
  [/\bhba1c\b|\bglycated h[a]?emoglobin\b/i, 'HbA1c'],
  [/\bha?emoglobin a1c\b/i, 'HbA1c'],
  [/\bha?emoglobin\b|\bhgb\b|\bhb\b/i, 'Hb'],
  [/\bha?ematocrit\b|\bhct\b|\bpcv\b/i, 'HCT'],
  [/\bwhite blood cell\b|\bwbc\b/i, 'WBC'],
  [/\bred blood cell\b|\brbc\b/i, 'RBC'],
  [/\bplatelet\b|\bplt\b/i, 'PLT'],
  [/\bmean corpuscular volume\b|\bmcv\b/i, 'MCV'],
  [/\bmean corpuscular ha?emoglobin concentration\b|\bmchc\b/i, 'MCHC'],
  [/\bmean corpuscular ha?emoglobin\b|\bmch\b/i, 'MCH'],
  [/\bred cell distribution width\b|\brdw\b/i, 'RDW'],
  [/\bmean platelet volume\b|\bmpv\b/i, 'MPV'],
  [/\bliver function\b|\blft\b/i, 'LFT'],
  [/\brenal function\b|\brft\b/i, 'RFT'],
  [/\bkidney function\b|\bkft\b/i, 'KFT'],
  [/\bthyroid function\b|\bthyroid profile\b|\btft\b/i, 'TFT'],
  [/\bthyroid stimulating hormone\b|\btsh\b/i, 'TSH'],
  [/\bfree t3\b|\bft3\b/i, 'FT3'],
  [/\bfree t4\b|\bft4\b/i, 'FT4'],
  [/\btriiodothyronine\b|\bt3\b/i, 'T3'],
  [/\bthyroxine\b|\bt4\b/i, 'T4'],
  [/\bc-?reactive protein\b|\bcrp\b/i, 'CRP'],
  [/\bhigh sensitivity c-?reactive protein\b|\bhs-?crp\b/i, 'hs-CRP'],
  [/\bfasting (plasma )?glucose\b|\bfbs\b|\bfpg\b/i, 'FBS'],
  [/\bpost ?(prandial|breakfast).*glucose\b|\bppbs\b|\bpbg\b/i, 'PPBS'],
  [/\brandom (blood )?sugar\b|\brbs\b/i, 'RBS'],
  [/\boral glucose tolerance test\b|\bogtt\b|\bgtt\b/i, 'OGTT'],
  [/\bblood urea nitrogen\b|\bbun\b/i, 'BUN'],
  [/\blipid profile\b/i, 'Lipid Profile'],
  [/\btotal cholesterol\b/i, 'TC'],
  [/\bhdl\b|\bhigh density lipoprotein\b/i, 'HDL'],
  [/\bldl\b|\blow density lipoprotein\b/i, 'LDL'],
  [/\bvldl\b|\bvery low density lipoprotein\b/i, 'VLDL'],
  [/\bvitamin d\b/i, 'Vit D'],
  [/\bvitamin b[- ]?12\b/i, 'Vit B12'],
  [/\bprostate specific antigen\b|\bpsa\b/i, 'PSA'],
  [/\balpha[- ]?fetoprotein\b|\bafp\b/i, 'AFP'],
  [/\balpha[- ]?1 antitrypsin\b|\ba1at\b/i, 'A1AT'],
  [/\bbeta[- ]?2 microglobulin\b|\bb2m\b/i, 'B2M'],
  [/\bcarcinoembryonic antigen\b|\bcea\b/i, 'CEA'],
  [/\bca[- ]?125\b/i, 'CA-125'],
  [/\bca[- ]?19[- ]?9\b/i, 'CA 19-9'],
  [/\btroponin[- ]?i\b/i, 'Trop I'],
  [/\btroponin[- ]?t\b/i, 'Trop T'],
  [/\btroponin\b/i, 'Troponin'],
  [/\bcreatine kinase[- ]?mb\b|\bck[- ]?mb\b/i, 'CK-MB'],
  [/\bsgpt\b|\balt\b/i, 'SGPT'],
  [/\bsgot\b|\bast\b/i, 'SGOT'],
  [/\balkaline phosphatase\b|\balp\b/i, 'ALP'],
  [/\bgamma glutamyl transferase\b|\bggt\b/i, 'GGT'],
  [/\belectrocardiogram\b|\becg\b/i, 'ECG'],
  [/\b2d echo\b|\bechocardiography\b/i, '2D Echo'],
  [/\btreadmill test\b|\btmt\b/i, 'TMT'],
  [/\bpulmonary function test\b|\bpft\b/i, 'PFT'],
  [/\bultrasound\b|\busg\b/i, 'USG'],
  [/\bcomputed tomography\b|\bct scan\b|\bct\b/i, 'CT'],
  [/\bmagnetic resonance imaging\b|\bmri\b/i, 'MRI'],
  [/\burine (routine|examination|analysis)|\bcue\b/i, 'CUE'],
  [/\bprothrombin time\b|\bpt[ /-]?inr\b|\binr\b/i, 'PT/INR'],
  [/\bpartial thromboplastin time\b|\bactivated partial thromboplastin time\b|\baptt\b|\bptt\b/i, 'APTT'],
  [/\bd[- ]?dimer\b/i, 'D-Dimer'],
  [/\brheumatoid factor\b|\brf\b/i, 'RF'],
  [/\banti nuclear antibody\b|\bantinuclear antibody\b|\bana\b/i, 'ANA'],
  [/\banti neutrophil cytoplasmic antibody\b|\banca\b|\ban?ca\b/i, 'ANCA'],
  [/\bhla[- ]?b27\b/i, 'HLA-B27'],
  [/\bhiv\b/i, 'HIV'],
  [/\bhbsag\b|\bhepatitis b surface antigen\b/i, 'HBsAg'],
  [/\bhcv\b|\bhepatitis c\b/i, 'HCV'],
  [/\bvdrl\b/i, 'VDRL'],
  [/\btpha\b/i, 'TPHA'],
  [/\bcytomegalovirus\b|\bcmv\b/i, 'CMV'],
  [/\bhuman papillomavirus\b|\bhpv\b/i, 'HPV'],
  [/\bpolymerase chain reaction\b|\bpcr\b/i, 'PCR'],
  [/\bmalaria parasite\b|\bmp\b/i, 'MP'],
  [/\bmrsa\b/i, 'MRSA'],
  [/\bdengue ns1\b/i, 'Dengue NS1'],
  [/\bige\b|\bimmunoglobulin e\b/i, 'IgE'],
  [/\bigg\b|\bimmunoglobulin g\b/i, 'IgG'],
  [/\bigm\b|\bimmunoglobulin m\b/i, 'IgM'],
  [/\biga\b|\bimmunoglobulin a\b/i, 'IgA'],
  [/\bfecal occult blood\b|\bfaecal occult blood\b|\bfobt\b/i, 'FOBT'],
  [/\bfollicle[- ]?stimulating hormone\b|\bfsh\b/i, 'FSH'],
  [/\bluteinizing hormone\b|\blh\b/i, 'LH'],
  [/\banti[- ]?müllerian hormone\b|\banti[- ]?mullerian hormone\b|\bamh\b/i, 'AMH'],
  [/\bdehydroepiandrosterone sulfate\b|\bdhea[- ]?s\b/i, 'DHEA-S'],
  [/\bg6pd\b|\bglucose[- ]?6[- ]?phosphate dehydrogenase\b/i, 'G6PD'],
  [/\bgamma[- ]?glutamyl transferase\b|\bggt\b/i, 'GGT'],
  [/\bglomerular filtration rate\b|\bgfr\b/i, 'GFR'],
  [/\binsulin[- ]?like growth factor 1\b|\bigf[- ]?1\b/i, 'IGF-1'],
  [/\blactate dehydrogenase\b|\bldh\b/i, 'LDH'],
  [/\bmethylmalonic acid\b|\bmma\b/i, 'MMA'],
  [/\bmthfr\b/i, 'MTHFR'],
  [/\bnatriuretic peptide\b|\bbnp\b|\bnt[- ]?probnp\b/i, 'BNP'],
  [/\bparathyroid hormone\b|\bpth\b/i, 'PTH'],
  [/\bsmooth muscle antibody\b|\bsma\b/i, 'SMA'],
  [/\bsex hormone[- ]?binding globulin\b|\bshbg\b/i, 'SHBG'],
  [/\bsexually transmitted infection\b|\bsti\b/i, 'STI'],
  [/\btricyclic antidepressant\b|\btca\b/i, 'TCA'],
  [/\b17[- ]?oh progesterone\b/i, '17-OHP'],
  [/\bwidal\b/i, 'Widal'],
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\bCbc\b/g, 'CBC')
    .replace(/\bCbp\b/g, 'CBP')
    .replace(/\bCue\b/g, 'CUE')
    .replace(/\bEsr\b/g, 'ESR')
    .replace(/\bCrp\b/g, 'CRP')
    .replace(/\bHscrp\b/g, 'hs-CRP')
    .replace(/\bHs-Crp\b/g, 'hs-CRP')
    .replace(/\bLft\b/g, 'LFT')
    .replace(/\bKft\b/g, 'KFT')
    .replace(/\bRft\b/g, 'RFT')
    .replace(/\bTft\b/g, 'TFT')
    .replace(/\bTsh\b/g, 'TSH')
    .replace(/\bFt3\b/g, 'FT3')
    .replace(/\bFt4\b/g, 'FT4')
    .replace(/\bFbs\b/g, 'FBS')
    .replace(/\bPpbs\b/g, 'PPBS')
    .replace(/\bRbs\b/g, 'RBS')
    .replace(/\bOgtt\b/g, 'OGTT')
    .replace(/\bBun\b/g, 'BUN')
    .replace(/\bHdl\b/g, 'HDL')
    .replace(/\bLdl\b/g, 'LDL')
    .replace(/\bVldl\b/g, 'VLDL')
    .replace(/\bPsa\b/g, 'PSA')
    .replace(/\bAfp\b/g, 'AFP')
    .replace(/\bCea\b/g, 'CEA')
    .replace(/\bCa (?=\d)/g, 'CA ')
    .replace(/\bCk-Mb\b/g, 'CK-MB')
    .replace(/\bSgpt\b/g, 'SGPT')
    .replace(/\bSgot\b/g, 'SGOT')
    .replace(/\bAlt\b/g, 'ALT')
    .replace(/\bAst\b/g, 'AST')
    .replace(/\bAlp\b/g, 'ALP')
    .replace(/\bGgt\b/g, 'GGT')
    .replace(/\bEcg\b/g, 'ECG')
    .replace(/\bUsg\b/g, 'USG')
    .replace(/\bPt\/Inr\b/g, 'PT/INR')
    .replace(/\bAptt\b/g, 'APTT')
    .replace(/\bAna\b/g, 'ANA')
    .replace(/\bAnca\b/g, 'ANCA')
    .replace(/\bHla-B27\b/g, 'HLA-B27')
    .replace(/\bVdrl\b/g, 'VDRL')
    .replace(/\bTpha\b/g, 'TPHA')
    .replace(/\bCmv\b/g, 'CMV')
    .replace(/\bHpv\b/g, 'HPV')
    .replace(/\bMrsa\b/g, 'MRSA')
    .replace(/\bPcr\b/g, 'PCR')
    .replace(/\bFobt\b/g, 'FOBT')
    .replace(/\bFsh\b/g, 'FSH')
    .replace(/\bAmh\b/g, 'AMH')
    .replace(/\bDhea-S\b/g, 'DHEA-S')
    .replace(/\bG6Pd\b/g, 'G6PD')
    .replace(/\bGfr\b/g, 'GFR')
    .replace(/\bIgf-1\b/g, 'IGF-1')
    .replace(/\bLdh\b/g, 'LDH')
    .replace(/\bMma\b/g, 'MMA')
    .replace(/\bMthfr\b/g, 'MTHFR')
    .replace(/\bBnp\b/g, 'BNP')
    .replace(/\bPth\b/g, 'PTH')
    .replace(/\bShbg\b/g, 'SHBG')
    .replace(/\bSti\b/g, 'STI')
    .replace(/\bTca\b/g, 'TCA')
    .replace(/\b17-Oh\b/g, '17-OH')
    .replace(/\bHiv\b/g, 'HIV')
    .replace(/\bHbsag\b/g, 'HBsAg')
    .replace(/\bHcv\b/g, 'HCV')
    .replace(/\bHba1c\b/g, 'HbA1c')
    .replace(/\bNs1\b/g, 'NS1')
    .replace(/\bIgg\b/g, 'IgG')
    .replace(/\bIgm\b/g, 'IgM')
    .replace(/\bIga\b/g, 'IgA')
    .replace(/\bIge\b/g, 'IgE')
    .replace(/\bDna\b/g, 'DNA')
    .replace(/\bRna\b/g, 'RNA')
    .replace(/\bCt\b/g, 'CT')
    .replace(/\bMri\b/g, 'MRI')
    .replace(/\bUsg\b/g, 'USG');
}

function isIndustryAcronym(value: string) {
  const candidate = value.trim();
  if (!candidate || candidate.length > 14) return false;
  const genericUppercaseWords = new Set([
    'BLOOD',
    'COMPLETE',
    'FASTING',
    'GLUCOSE',
    'KIDNEY',
    'LIVER',
    'PROFILE',
    'RANDOM',
    'RENAL',
    'SERUM',
    'THYROID',
    'TOTAL',
    'URINE',
    'VITAMIN',
  ]);
  if (genericUppercaseWords.has(candidate.toUpperCase())) return false;
  if (/^(?:[A-Z]{2,}[A-Z0-9+/-]*|[A-Z]{1,4}[- ]?\d+[A-Z0-9+/-]*|\d+[ -]?[A-Z]{2,})$/.test(candidate)) {
    return true;
  }
  return /^(?:HbA1c|HBsAg|HBeAg|Anti[- ]?[A-Z0-9]+|Ig[AGEMD]|CA[- ]?\d+(?:[- ]?\d+)?)$/.test(candidate);
}

function shortNameFor(name: string) {
  for (const [pattern, shortName] of shortNameOverrides) {
    if (pattern.test(name)) return shortName;
  }

  const bracketMatch = name.match(/\(([A-Za-z0-9+ -]{2,18})\)/);
  if (bracketMatch) {
    const candidate = bracketMatch[1].replace(/\s+/g, ' ').trim();
    if (isIndustryAcronym(candidate)) return candidate;
  }

  const firstToken = name.trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9+/-]/g, '') || '';
  if (isIndustryAcronym(firstToken)) return firstToken;

  return '';
}

function categoryFor(name: string) {
  const normalized = name.toLowerCase();

  if (/\b(glucose|sugar|hba1c|insulin|diabetes|microalbumin creatinine)\b/i.test(normalized)) {
    return 'Diabetes';
  }
  if (/\b(cbc|cbp|ha?emoglobin|platelet|rbc|wbc|blood group|coagulation|pt |aptt|iron|ferritin|transferrin|reticulocyte)\b/i.test(normalized)) {
    return 'Blood Health';
  }
  if (/\b(dengue|malaria|typhoid|widal|hiv|hbsag|hcv|covid|culture|antigen|antibody|igm|igg|infection|fever|parasite|tuberculosis|tb\b)\b/i.test(normalized)) {
    return 'Fever & Infection';
  }
  if (/\b(thyroid|t3|t4|tsh|hormone|cortisol|prolactin|testosterone|progesterone|estradiol|fsh|lh|amh|dhea|insulin like)\b/i.test(normalized)) {
    return 'Thyroid & Hormones';
  }
  if (/\b(liver|bilirubin|sgpt|sgot|alt|ast|alkaline phosphatase|ggt|gamma gt|albumin|protein total)\b/i.test(normalized)) {
    return 'Liver Health';
  }
  if (/\b(kidney|renal|creatinine|urea|uric acid|urine|urinary|cystatin|electrolyte|sodium|potassium|chloride)\b/i.test(normalized)) {
    return 'Kidney & Urine';
  }
  if (/\b(lipid|cholesterol|triglyceride|hdl|ldl|vldl|heart|cardiac|troponin|ck-?mb|ecg|echo|homocysteine)\b/i.test(normalized)) {
    return 'Heart Health';
  }
  if (/\b(vitamin|mineral|calcium|phosphorus|magnesium|zinc|copper|folate|b12|d3|electrolyte)\b/i.test(normalized)) {
    return 'Vitamins & Minerals';
  }
  if (/\b(pregnancy|beta hcg|hcg|pap smear|mammography|fertility|ovary|ovarian|menopause|antenatal)\b/i.test(normalized)) {
    return 'Women’s Health';
  }
  if (/\b(cancer|tumou?r|marker|ca[- ]?125|ca[- ]?19|cea|afp|psa|cyfra|beta-2 microglobulin)\b/i.test(normalized)) {
    return 'Cancer Markers';
  }
  if (/\b(allergy|ige|autoimmune|ana|anca|immunoglobulin|hla|complement)\b/i.test(normalized)) {
    return 'Allergy & Immunology';
  }
  if (/\b(x[- ]?ray|ultrasound|usg|mri|ct scan|scan|doppler|echo|ecg|pft|endoscopy|procedure)\b/i.test(normalized)) {
    return 'Imaging & Procedures';
  }

  return 'General Diagnostics';
}

function sampleTypeFor(name: string, category: string) {
  const normalized = name.toLowerCase();
  if (/\burine|urinary\b/i.test(normalized)) return 'Urine';
  if (/\bstool|faecal|fecal\b/i.test(normalized)) return 'Stool';
  if (/\bsemen\b/i.test(normalized)) return 'Semen';
  if (/\bsputum\b/i.test(normalized)) return 'Sputum';
  if (/\bswab\b/i.test(normalized)) return 'Swab';
  if (/\bbiopsy|histopathology|tissue\b/i.test(normalized)) return 'Tissue';
  if (category === 'Imaging & Procedures') return 'Imaging / procedure';
  if (/\bculture\b/i.test(normalized)) return 'Sample as advised';
  return 'Blood';
}

function preparationFor(name: string, sampleType: string) {
  const normalized = name.toLowerCase();
  if (/\bfasting|fbs|fasting plasma glucose|lipid\b/i.test(normalized)) {
    return 'Fasting may be required. Please follow the clinic or lab instructions.';
  }
  if (/\bpost ?(prandial|breakfast)|ppbs|pbg\b/i.test(normalized)) {
    return 'Follow the advised meal timing and sample timing.';
  }
  if (sampleType === 'Urine') return 'A clean-catch urine sample is usually preferred.';
  if (sampleType === 'Stool') return 'Collect the sample in the sterile container provided by the lab.';
  if (sampleType === 'Imaging / procedure') return 'Preparation depends on the procedure. The clinic team will guide you before the test.';
  return 'Usually no fasting required unless advised by the clinician or lab.';
}

function descriptionFor(name: string, category: string) {
  const specific = categoryContent[category] || categoryContent['General Diagnostics'];
  const testName = displayNameFor(name);
  const description = specific.description.replace(/\.$/, '');
  const readableDescription = description.charAt(0).toLowerCase() + description.slice(1);
  return `${testName} ${readableDescription}.`;
}

function whyNeededFor(category: string) {
  return (categoryContent[category] || categoryContent['General Diagnostics']).whyNeeded;
}

const popularTestRankRules: Array<[RegExp, number]> = [
  [/\bcomplete blood count\b|\bcomplete blood picture\b|\bcbc\b|\bcbp\b/i, 10],
  [/\bfasting (blood|plasma)? ?(sugar|glucose)\b|\bfbs\b|\bfpg\b/i, 20],
  [/\bpost ?(prandial|breakfast).*?(sugar|glucose)\b|\bppbs\b|\bpbg\b/i, 30],
  [/\brandom (blood )?(sugar|glucose)\b|\brbs\b/i, 40],
  [/\bhba1c\b|\bglycated h[a]?emoglobin\b|\bha?emoglobin a1c\b/i, 50],
  [/\bthyroid function\b|\bthyroid profile\b|\btft\b/i, 60],
  [/^(?:ultrasensitive )?tsh(?!\s+receptor)(?:\b|\s*\()|\bthyroid stimulating hormone\b(?!\s+receptor)/i, 70],
  [/\blipid profile\b/i, 80],
  [/\bliver function\b|\blft\b/i, 90],
  [/\bkidney function\b|\brenal function\b|\bkft\b|\brft\b/i, 100],
  [/\burine routine\b|\burine examination\b|\bcomplete urine\b|\bcue\b/i, 110],
  [/\berythrocyte sedimentation rate\b|\besr\b/i, 120],
  [/^crp\b|\bc-?reactive protein\b/i, 130],
  [/\bhigh sensitive crp\b|\bhs[- ]?crp\b/i, 132],
  [/^vitamin d$|\bvitamin d total\b|\b25[- ]?hydroxy\b/i, 140],
  [/\bvitamin d\b/i, 145],
  [/\bvitamin b[- ]?12\b/i, 150],
  [/\bdengue ns1\b/i, 160],
  [/\bdengue\b/i, 170],
  [/\bwidal\b/i, 180],
  [/\bmalaria\b|\bmp\b/i, 190],
  [/\bhbsag\b|\bhepatitis b surface antigen\b/i, 200],
  [/\bhiv\b/i, 210],
  [/\bhcv\b|\bhepatitis c\b/i, 220],
  [/\bbeta[- ]?hcg\b|\bhcg\b|\bpregnancy\b/i, 230],
  [/\buric acid\b/i, 240],
  [/\bcalcium\b/i, 250],
  [/\belectrolyte\b|\bsodium\b|\bpotassium\b|\bchloride\b/i, 260],
  [/\biron\b|\bferritin\b|\btibc\b/i, 270],
  [/\bprothrombin time\b|\bpt[ /-]?inr\b|\binr\b/i, 280],
  [/\baptt\b|\bpartial thromboplastin\b/i, 290],
  [/\belectrocardiogram\b|\becg\b/i, 300],
  [/\b2d echo\b|\bechocardiography\b/i, 310],
  [/\bultrasound\b|\busg\b/i, 320],
  [/\bx[- ]?ray\b/i, 330],
  [/\bpap smear\b/i, 340],
  [/\bprostate specific antigen\b|\bpsa\b/i, 350],
  [/\bca[- ]?125\b/i, 360],
  [/\btroponin\b/i, 370],
  [/\bblood group\b/i, 380],
  [/\bstool routine\b|\bstool examination\b/i, 390],
  [/\bthyroxine\b|\bt4\b/i, 400],
  [/\btriiodothyronine\b|\bt3\b/i, 410],
  [/\bcreatinine\b/i, 420],
  [/\burea\b|\bbun\b/i, 430],
  [/\bbilirubin\b/i, 440],
  [/\bsgpt\b|\balt\b/i, 450],
  [/\bsgot\b|\bast\b/i, 460],
  [/\balkaline phosphatase\b|\balp\b/i, 470],
  [/\bgamma[- ]?glutamyl transferase\b|\bggt\b/i, 480],
];

function popularityRankFor(name: string) {
  for (const [pattern, rank] of popularTestRankRules) {
    if (pattern.test(name)) return rank;
  }
  return null;
}

function displayOrderFor(name: string, category: string, index: number) {
  const popularityRank = popularityRankFor(name);
  if (popularityRank !== null) return popularityRank * 1_000 + index;

  const categoryRank = categoryOrder.indexOf(category);
  const safeCategoryRank = categoryRank >= 0 ? categoryRank : categoryOrder.length;
  return 1_000_000 + safeCategoryRank * 10_000 + index;
}

function isCbcCbpDuplicate(name: string) {
  return /^complete blood picture \(cbp\)$/i.test(name.trim());
}

function displayNameFor(name: string) {
  if (/^complete blood count \(cbc\)$/i.test(name.trim())) {
    return 'CBC / CBP (Complete Blood Count / Complete Blood Picture)';
  }

  return titleCase(name);
}

function displayShortNameFor(name: string) {
  if (/^complete blood count \(cbc\)$/i.test(name.trim())) {
    return 'CBC / CBP';
  }

  return shortNameFor(name);
}

function offerPriceFor(test: { name: string; price?: number; offerPrice?: number }) {
  if (/^complete blood count \(cbc\)$/i.test(test.name.trim())) {
    const cbp = importedLabTests.find((item) => /^complete blood picture \(cbp\)$/i.test(item.name.trim()));
    const candidatePrices = [test.offerPrice, cbp?.offerPrice].filter(
      (price): price is number => typeof price === 'number' && price > 0
    );
    if (candidatePrices.length) return Math.min(...candidatePrices);
  }

  return test.offerPrice;
}

function buildCatalog() {
  const seenSlugs = new Map<string, number>();

  return importedLabTests.filter((test) => !isCbcCbpDuplicate(test.name)).map((test, index) => {
    const baseSlug = slugify(test.name) || `lab-test-${index + 1}`;
    const seenCount = seenSlugs.get(baseSlug) || 0;
    seenSlugs.set(baseSlug, seenCount + 1);
    const slug = seenCount ? `${baseSlug}-${seenCount + 1}` : baseSlug;
    const category = categoryFor(test.name);
    const sampleType = sampleTypeFor(test.name, category);

    return {
      slug,
      shortName: displayShortNameFor(test.name),
      fullName: displayNameFor(test.name),
      category,
      sampleType,
      description: descriptionFor(test.name, category),
      whyNeeded: whyNeededFor(category),
      preparation: preparationFor(test.name, sampleType),
      price: test.price,
      offerPrice: offerPriceFor(test),
      displayOrder: displayOrderFor(test.name, category, index),
    };
  });
}

export const labTestCatalog: LabTestCatalogItem[] = buildCatalog();

export const labTestCategories = [
  ...categoryOrder.filter((category) => labTestCatalog.some((test) => test.category === category)),
  ...[...new Set(labTestCatalog.map((test) => test.category))].filter(
    (category) => !categoryOrder.includes(category)
  ),
];
