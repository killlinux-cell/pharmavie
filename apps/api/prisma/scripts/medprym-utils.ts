/** Mapping simplifié code ATC → catégorie thérapeutique PharmaVie */
export function categoryFromAtc(atc?: string | null): string {
  if (!atc || atc.length < 1) return 'Médicament';
  const letter = atc[0].toUpperCase();
  const map: Record<string, string> = {
    A: 'Gastro-entérologie',
    B: 'Sang et coagulation',
    C: 'Cardiologie',
    D: 'Dermatologie',
    G: 'Gynécologie/Urologie',
    H: 'Hormones',
    J: 'Antibiotique',
    L: 'Anticancéreux',
    M: 'Musculo-squelettique',
    N: 'Neurologie/Psychiatrie',
    P: 'Antiparasitaire',
    R: 'Respiratoire',
    S: 'Organes sensoriels',
    V: 'Divers',
  };
  return map[letter] ?? 'Médicament';
}

const RX_ATC_PREFIXES = [
  'J', // antibiotiques
  'L', // anticancéreux
  'N02A', // opioïdes
  'N05', // psychoanaleptiques
  'H03', // hormones thyroïdiennes Rx
  'A10', // antidiabétiques
  'P01', // antipaludéens
  'C01', // cardiotoniques
  'G03', // hormones sexuelles
];

const RX_KEYWORDS = [
  'insuline',
  'morphine',
  'tramadol',
  'amoxicilline',
  'ciprofloxacine',
  'azithromycine',
  'artéméther',
  'artésunate',
  'ciclosporine',
  'carbamazépine',
  'fluoxétine',
  'prednisolone',
  'dexaméthasone',
  'warfarine',
  'héparine',
  'methotrexate',
];

export function inferRequiresRx(name: string, dci?: string | null, atc?: string | null): boolean {
  const text = `${name} ${dci ?? ''}`.toLowerCase();
  if (RX_KEYWORDS.some((k) => text.includes(k))) return true;
  if (!atc) return false;
  const code = atc.toUpperCase();
  return RX_ATC_PREFIXES.some((p) => code.startsWith(p));
}

/** Prix indicatif FCFA selon catégorie (MEDPRYM ne publie pas les prix) */
export function estimatePrice(category: string, requiresRx: boolean): number {
  const base: Record<string, number> = {
    Antibiotique: 2800,
    Antipaludéen: 3500,
    Antidiabétique: 4500,
    Cardiologie: 2200,
    Dermatologie: 1800,
    'Gastro-entérologie': 1600,
    Antalgique: 800,
    'Anti-inflammatoire': 1500,
    'Musculo-squelettique': 1800,
    'Neurologie/Psychiatrie': 3500,
    Respiratoire: 2500,
    Antiparasitaire: 600,
    'Vitamines/Minéraux': 900,
    Vaccin: 12000,
    Médicament: 1500,
  };
  const price = base[category] ?? 1500;
  return requiresRx ? Math.round(price * 1.15) : price;
}

export function airpToBarcode(_airpAuth: string, seq: number): string {
  return `619${String(seq).padStart(10, '0')}`;
}

export function normalizeDci(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[,/;]/)[0]
    .trim();
  if (!cleaned || cleaned.length < 2) return undefined;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
