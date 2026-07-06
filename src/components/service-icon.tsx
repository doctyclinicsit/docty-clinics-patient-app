import type { SVGProps } from 'react';

type ServiceIconProps = SVGProps<SVGSVGElement> & {
  serviceName: string;
};

function getIconKind(serviceName: string) {
  const name = serviceName.toLowerCase();

  if (/(pharmacy|medicine|medication)/.test(name)) return 'pharmacy';
  if (/(diagnostic|laboratory|lab test|blood test|screening|health check)/.test(name)) return 'diagnostics';
  if (/(dental|tooth|teeth|oral|crown|denture|root canal|gum)/.test(name)) return 'dental';
  if (/(cardiac|cardio|heart|hypertension|blood pressure|cholesterol)/.test(name)) return 'heart';
  if (/(lung|pulmon|respirat|asthma|breathing|chest)/.test(name)) return 'lungs';
  if (/(brain|neuro|headache|migraine|epilep|stroke)/.test(name)) return 'brain';
  if (/(spine|spinal|back pain|neck pain|posture|sciatica)/.test(name)) return 'spine';
  if (/(knee|shoulder|joint|arthritis|ligament|sports injury|orthop)/.test(name)) return 'joint';
  if (/(eye|vision|ophthal|cataract|retina)/.test(name)) return 'eye';
  if (/(kidney|renal|urinary|urology|urine)/.test(name)) return 'kidney';
  if (/(liver|hepatic|fatty liver)/.test(name)) return 'liver';
  if (/(skin|dermat|hair|acne|rash)/.test(name)) return 'skin';
  if (/(diabetes|diabetic|blood sugar|glucose|endocrin|thyroid)/.test(name)) return 'metabolic';
  if (/(vaccin|immun)/.test(name)) return 'vaccination';
  if (/(pregnan|maternity|gynaec|gynecol|women|pcos|fertility|menopause)/.test(name)) return 'women';
  if (/(mental|psychiatr|psycholog|anxiety|depression|counselling|stress)/.test(name)) return 'mental-health';
  if (/(ear|nose|throat|ent|sinus|hearing|voice)/.test(name)) return 'ent';
  if (/(pediatric|paediatric|child|baby|newborn|new born)/.test(name)) return 'pediatrics';
  if (/(gastric|stomach|digest|gerd|acid reflux|nutrition)/.test(name)) return 'digestive';
  if (/(physio|rehab|therapy|exercise|mobility)/.test(name)) return 'physiotherapy';
  if (/(day care|admission|procedure|iv fluid|infusion)/.test(name)) return 'day-care';
  if (/(specialist|surgeon|consultant)/.test(name)) return 'specialist';
  return 'primary-care';
}

export function ServiceIcon({ serviceName, className, ...props }: ServiceIconProps) {
  const kind = getIconKind(serviceName);
  const red = '#FE065C';
  const blue = '#0BB8FC';
  const common = {
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2.5,
  };

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={`${serviceName} icon`}
      {...props}
    >
      {kind === 'pharmacy' && (
        <>
          <path {...common} stroke={red} d="M11 29.5 28.5 12a8 8 0 0 1 11.3 11.3L22.3 40.8A8 8 0 0 1 11 29.5Z" />
          <path {...common} stroke={blue} d="m19.7 20.8 11.4 11.4" />
          <path {...common} stroke={blue} d="M13.7 27.2h12.1v12.1" />
        </>
      )}

      {kind === 'diagnostics' && (
        <>
          <path {...common} stroke={red} d="M18 8h11v6H18zM20 14v12a8 8 0 0 0 8 8h3" />
          <path {...common} stroke={blue} d="m29 14 5 6-8 7-5-6M11 39h27M15 34h20v5" />
          <circle cx="34" cy="27" r="4" fill="none" stroke={red} strokeWidth="2.5" />
        </>
      )}

      {kind === 'dental' && (
        <>
          <path {...common} stroke={red} d="M24 11c-5-5-13-1-13 6 0 9 5 21 9 21 3 0 1-10 4-10s1 10 4 10c4 0 9-12 9-21 0-7-8-11-13-6Z" />
          <path {...common} stroke={blue} d="M20 14c2 1 6 1 8 0" />
          <path {...common} stroke={blue} d="M31 8v6M28 11h6" />
        </>
      )}

      {kind === 'heart' && (
        <>
          <path {...common} stroke={red} d="M24 40S9 31 9 19c0-7 8-11 15-4 7-7 15-3 15 4 0 12-15 21-15 21Z" />
          <path {...common} stroke={blue} d="M8 25h8l3-7 5 14 4-9 3 2h9" />
        </>
      )}

      {kind === 'lungs' && (
        <>
          <path {...common} stroke={blue} d="M24 7v19M24 16l-7 6M24 16l7 6" />
          <path {...common} stroke={red} d="M19 17c-5 1-10 7-11 15-1 6 3 9 8 7 4-2 6-7 6-13V14M29 17c5 1 10 7 11 15 1 6-3 9-8 7-4-2-6-7-6-13V14" />
        </>
      )}

      {kind === 'brain' && (
        <>
          <path {...common} stroke={red} d="M20 40c-4 0-7-3-7-7-4-1-6-5-4-9-3-4 0-9 4-10 0-5 6-8 10-5 3-3 9-1 9 4 5 0 8 6 5 10 4 3 2 9-2 10 0 5-6 8-10 5-2 3-7 2-7-2Z" />
          <path {...common} stroke={blue} d="M23 10v30M16 15c4 0 7 3 7 7M13 25c4-1 8 1 10 4M32 14c-4 1-6 4-6 8M36 26c-5-1-8 2-9 6" />
        </>
      )}

      {kind === 'spine' && (
        <>
          <path {...common} stroke={red} d="M25 7c-5 4-1 8-4 12s2 7 0 11 2 8-2 12" />
          <path {...common} stroke={blue} d="M20 10h9M18 16h10M17 23h10M18 30h9M16 37h9" />
          <circle cx="35" cy="27" r="6" fill="none" stroke={red} strokeWidth="2.5" />
          <path {...common} stroke={blue} d="m32 27 2 2 4-5" />
        </>
      )}

      {kind === 'joint' && (
        <>
          <path {...common} stroke={red} d="M15 7c0 10 2 14 8 18M33 41c0-10-2-14-8-18" />
          <circle cx="24" cy="24" r="7" fill="none" stroke={blue} strokeWidth="2.5" />
          <path {...common} stroke={red} d="M9 7h12M27 41h12" />
          <path {...common} stroke={blue} d="m20 24 3 3 6-7" />
        </>
      )}

      {kind === 'eye' && (
        <>
          <path {...common} stroke={red} d="M5 24s7-11 19-11 19 11 19 11-7 11-19 11S5 24 5 24Z" />
          <circle cx="24" cy="24" r="7" fill="none" stroke={blue} strokeWidth="2.5" />
          <circle cx="24" cy="24" r="2.5" fill={red} />
        </>
      )}

      {kind === 'kidney' && (
        <>
          <path {...common} stroke={red} d="M19 9c-7 0-11 6-10 14 1 9 7 14 13 11 4-2 4-7 4-12 0-7-2-13-7-13Z" />
          <path {...common} stroke={blue} d="M29 9c7 0 11 6 10 14-1 9-7 14-13 11-4-2-4-7-4-12 0-7 2-13 7-13Z" />
          <path {...common} stroke={red} d="M19 34v7M29 34v7" />
        </>
      )}

      {kind === 'liver' && (
        <>
          <path {...common} stroke={red} d="M8 21c8-11 22-14 33-7v13c-8 7-19 10-33 6V21Z" />
          <path {...common} stroke={blue} d="M25 15c0 9-5 14-13 17M28 28h10" />
        </>
      )}

      {kind === 'skin' && (
        <>
          <path {...common} stroke={red} d="M7 15c7-5 13 5 20 0s10 1 14 0v20c-7 5-13-5-20 0s-10-1-14 0V15Z" />
          <path {...common} stroke={blue} d="M11 23c5-3 9 3 14 0s8 1 12 0M11 29c5-3 9 3 14 0s8 1 12 0" />
          <circle cx="18" cy="18" r="2" fill={red} />
        </>
      )}

      {kind === 'metabolic' && (
        <>
          <path {...common} stroke={red} d="M24 6s10 12 10 21a10 10 0 0 1-20 0c0-9 10-21 10-21Z" />
          <path {...common} stroke={blue} d="M17 27h14M24 20v14" />
          <circle cx="37" cy="12" r="5" fill="none" stroke={blue} strokeWidth="2.5" />
          <path {...common} stroke={red} d="M37 9v6M34 12h6" />
        </>
      )}

      {kind === 'physiotherapy' && (
        <>
          <circle cx="24" cy="10" r="4" fill="none" stroke={red} strokeWidth="2.5" />
          <path {...common} stroke={red} d="M24 14v13l-8 12M24 21l10 7M24 27l9 12" />
          <path {...common} stroke={blue} d="M13 20c5-4 9-4 11-2M34 20c-5-4-8-4-10-2" />
          <circle cx="34" cy="28" r="3" fill="none" stroke={blue} strokeWidth="2.5" />
        </>
      )}

      {kind === 'vaccination' && (
        <>
          <path {...common} stroke={red} d="m14 34 20-20M29 10l9 9M25 14l9 9M11 37l6-2-4-4-2 6Z" />
          <path {...common} stroke={blue} d="m18 26 4 4M34 10l4-4M9 13v8M5 17h8" />
        </>
      )}

      {kind === 'women' && (
        <>
          <path {...common} stroke={red} d="M34 19c0 9-10 16-10 16S14 28 14 19a7 7 0 0 1 10-6 7 7 0 0 1 10 6Z" />
          <path {...common} stroke={blue} d="M24 35v8M19 39h10" />
          <path {...common} stroke={blue} d="M20 24c2-3 6-3 8 0" />
        </>
      )}

      {kind === 'mental-health' && (
        <>
          <path {...common} stroke={red} d="M30 39H17v-7c-4-3-6-8-5-13 1-7 7-12 14-12 8 0 14 6 14 14 0 5-3 9-7 12v6" />
          <path {...common} stroke={blue} d="M27 15c-3-3-8 1-3 6 5-5 0-9-3-6" />
          <path {...common} stroke={blue} d="M18 27c4 2 8 2 12 0" />
        </>
      )}

      {kind === 'ent' && (
        <>
          <path {...common} stroke={red} d="M30 36c0 4-3 7-7 7-3 0-5-2-5-5 0-4 5-5 5-10 0-3-2-5-5-5s-5 2-5 5" />
          <path {...common} stroke={red} d="M14 19C14 11 20 6 28 7c7 1 11 7 9 14-1 5-5 7-8 10" />
          <path {...common} stroke={blue} d="M22 17c5-4 11 1 8 6-1 2-4 3-5 6" />
          <circle cx="14" cy="28" r="3" fill="none" stroke={blue} strokeWidth="2.5" />
        </>
      )}

      {kind === 'pediatrics' && (
        <>
          <circle cx="24" cy="21" r="10" fill="none" stroke={red} strokeWidth="2.5" />
          <circle cx="15" cy="13" r="4" fill="none" stroke={blue} strokeWidth="2.5" />
          <circle cx="33" cy="13" r="4" fill="none" stroke={blue} strokeWidth="2.5" />
          <path {...common} stroke={blue} d="M20 20h.1M28 20h.1M21 25c2 2 4 2 6 0M16 33l-3 8M32 33l3 8M19 39h10" />
        </>
      )}

      {kind === 'digestive' && (
        <>
          <path {...common} stroke={red} d="M25 7v10c0 4 3 7 7 7h5v7c0 7-5 11-12 11-8 0-14-5-14-13 0-6 3-10 8-12" />
          <path {...common} stroke={blue} d="M20 17c-5 2-7 6-7 11 0 6 4 10 10 10 5 0 9-3 9-8v-2" />
          <path {...common} stroke={blue} d="M31 11h8M35 7v8" />
        </>
      )}

      {kind === 'day-care' && (
        <>
          <path {...common} stroke={red} d="M8 35h32M10 35V22h8c5 0 8 3 8 8v5M26 27h12v8M13 18h8" />
          <path {...common} stroke={blue} d="M32 10v10M27 15h10" />
          <circle cx="14" cy="27" r="3" fill="none" stroke={blue} strokeWidth="2.5" />
        </>
      )}

      {kind === 'specialist' && (
        <>
          <circle cx="18" cy="17" r="6" fill="none" stroke={red} strokeWidth="2.5" />
          <path {...common} stroke={red} d="M7 39c1-8 5-12 11-12s10 4 11 12" />
          <circle cx="34" cy="21" r="4" fill="none" stroke={blue} strokeWidth="2.5" />
          <path {...common} stroke={blue} d="M29 31c2-3 5-5 8-4 3 1 5 4 5 8M34 7v8M30 11h8" />
        </>
      )}

      {kind === 'primary-care' && (
        <>
          <path {...common} stroke={red} d="M13 9v10a10 10 0 0 0 20 0V9M9 9h8M29 9h8" />
          <path {...common} stroke={red} d="M23 29v3c0 6 4 10 9 10 4 0 7-3 7-7" />
          <circle cx="39" cy="31" r="4" fill="none" stroke={blue} strokeWidth="2.5" />
          <path {...common} stroke={blue} d="M20 18h8M24 14v8" />
        </>
      )}
    </svg>
  );
}
