/** Utilitaires import pharmacies CI — OSM + UNPPCI (annuaireci.com) */

export interface OsmPharmacy {
  osmId: string;
  name: string;
  street: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export interface DutyPharmacy {
  name: string;
  district: string;
  city: string;
  sector?: string;
  street?: string;
  phone?: string;
}

export interface DutyWeek {
  weekStart: Date;
  weekEnd: Date;
}

export const CI_REGIONS: { name: string; city: string; bbox: [number, number, number, number] }[] = [
  { name: 'Abidjan', city: 'Abidjan', bbox: [5.2, -4.2, 5.55, -3.85] },
  { name: 'Bouaké', city: 'Bouaké', bbox: [7.65, -5.05, 7.75, -4.95] },
  { name: 'Yamoussoukro', city: 'Yamoussoukro', bbox: [6.78, -5.32, 6.88, -5.22] },
  { name: 'Daloa', city: 'Daloa', bbox: [6.85, -6.48, 6.95, -6.38] },
  { name: 'San-Pédro', city: 'San-Pédro', bbox: [4.72, -6.68, 4.78, -6.62] },
  { name: 'Korhogo', city: 'Korhogo', bbox: [9.43, -5.58, 9.49, -5.52] },
  { name: 'Gagnoa', city: 'Gagnoa', bbox: [6.12, -5.98, 6.18, -5.92] },
  { name: 'Man', city: 'Man', bbox: [7.38, -7.58, 7.44, -7.52] },
  { name: 'Grand-Bassam', city: 'Grand-Bassam', bbox: [5.18, -3.78, 5.24, -3.72] },
  { name: 'Divo', city: 'Divo', bbox: [5.82, -5.38, 5.88, -5.32] },
];

export const DISTRICT_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  plateau: { lat: 5.3197, lng: -4.0268, city: 'Abidjan' },
  cocody: { lat: 5.3599, lng: -3.9873, city: 'Abidjan' },
  yopougon: { lat: 5.3364, lng: -4.0889, city: 'Abidjan' },
  marcory: { lat: 5.3012, lng: -3.9821, city: 'Abidjan' },
  'marcory sud': { lat: 5.295, lng: -3.985, city: 'Abidjan' },
  abobo: { lat: 5.4167, lng: -4.0167, city: 'Abidjan' },
  adjame: { lat: 5.3533, lng: -4.0267, city: 'Abidjan' },
  'adjame centre': { lat: 5.3533, lng: -4.0267, city: 'Abidjan' },
  attécoubé: { lat: 5.345, lng: -4.045, city: 'Abidjan' },
  attecoube: { lat: 5.345, lng: -4.045, city: 'Abidjan' },
  koumassi: { lat: 5.289, lng: -3.961, city: 'Abidjan' },
  'port-bouet': { lat: 5.254, lng: -3.926, city: 'Abidjan' },
  riviera: { lat: 5.365, lng: -3.975, city: 'Abidjan' },
  vridi: { lat: 5.268, lng: -4.005, city: 'Abidjan' },
  williamsville: { lat: 5.328, lng: -4.055, city: 'Abidjan' },
  treichville: { lat: 5.305, lng: -4.015, city: 'Abidjan' },
  anyama: { lat: 5.495, lng: -4.051, city: 'Abidjan' },
  abengourou: { lat: 6.729, lng: -3.496, city: 'Abengourou' },
  bouake: { lat: 7.693, lng: -5.03, city: 'Bouaké' },
  daloa: { lat: 6.877, lng: -6.45, city: 'Daloa' },
  divo: { lat: 5.842, lng: -5.357, city: 'Divo' },
  yamoussoukro: { lat: 6.827, lng: -5.289, city: 'Yamoussoukro' },
  korhogo: { lat: 9.458, lng: -5.548, city: 'Korhogo' },
  'san-pedro': { lat: 4.748, lng: -6.636, city: 'San-Pédro' },
};

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'pharmacie'
  );
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/pharmacie/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeDistrict(raw: string): { district: string; city: string; sector?: string } {
  const cleaned = raw.replace(/\d+$/, '').trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();
  const sectorMatch = lower.match(/yopougon\s+secteur\s+(\d+)/i);
  if (sectorMatch) {
    return { district: 'Yopougon', city: 'Abidjan', sector: `Secteur ${sectorMatch[1]}` };
  }
  for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
    if (lower.startsWith(key) || lower.includes(key)) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return { district: label.replace(/-/g, ' '), city: coords.city };
    }
  }
  const city = cleaned.split(/[/\-]/)[0].trim();
  return { district: city, city: city === 'Abidjan' ? 'Abidjan' : city };
}

export function coordsForDistrict(district: string, city: string, seed: string): { lat: number; lng: number } {
  const key = district.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const base = DISTRICT_COORDS[key] ?? DISTRICT_COORDS[city.toLowerCase()] ?? { lat: 5.32, lng: -4.02, city: 'Abidjan' };
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return {
    lat: base.lat + ((hash % 100) - 50) / 5000,
    lng: base.lng + (((hash >> 8) % 100) - 50) / 5000,
  };
}

export function parsePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+225')) return digits;
  const nums = raw.replace(/\D/g, '');
  if (nums.length >= 8) return `+225${nums.slice(-10)}`;
  return raw.trim();
}

export function parseWeekRange(html: string): DutyWeek | null {
  const text = html.replace(/<[^>]+>/g, ' ');
  const m = text.match(/Semaine du (\d{2})\/(\d{2})\/(\d{4}) au (\d{2})\/(\d{2})\/(\d{4})/i);
  if (!m) return null;
  return {
    weekStart: new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z`),
    weekEnd: new Date(`${m[6]}-${m[5]}-${m[4]}T23:59:59.000Z`),
  };
}

export function parseAnnuaireciDuty(html: string): { week: DutyWeek | null; pharmacies: DutyPharmacy[] } {
  const week = parseWeekRange(html);
  const pharmacies: DutyPharmacy[] = [];

  const cardRe =
    /class="v2-garde-card"[\s\S]*?data-name="([^"]*)"[\s\S]*?data-phone="([^"]*)"[\s\S]*?data-address="([^"]*)"[\s\S]*?data-section="([^"]*)"/g;

  let match: RegExpExecArray | null;
  while ((match = cardRe.exec(html)) !== null) {
    const [, rawName, rawPhone, street, section] = match;
    const name = rawName.trim();
    if (!name) continue;
    const { district, city, sector } = normalizeDistrict(section.trim());
    pharmacies.push({
      name: name.startsWith('Pharmacie') ? name : `Pharmacie ${name}`,
      district,
      city,
      sector,
      street: street.trim(),
      phone: parsePhone(rawPhone.split('/')[0].trim()),
    });
  }

  if (pharmacies.length === 0) {
    const sections = html.split(/###\s+/).slice(1);
    for (const section of sections) {
      const headerLine = section.split('\n')[0]?.trim() ?? '';
      if (!headerLine) continue;
      const { district, city, sector } = normalizeDistrict(headerLine.replace(/\s+\d+$/, '').trim());
      const blocks = section.split(/####\s+/).slice(1);
      for (const block of blocks) {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const n = lines[0]?.trim();
        if (!n) continue;
        let street: string | undefined;
        let phone: string | undefined;
        for (const line of lines.slice(1)) {
          if (/^\d{2}\s[\d\s/+\-]{6,}/.test(line)) phone = parsePhone(line.split('/')[0].trim());
          else if (!street && line.length > 5) street = line;
        }
        pharmacies.push({
          name: n.startsWith('Pharmacie') ? n : `Pharmacie ${n}`,
          district,
          city,
          sector,
          street,
          phone: phone ?? '+2250000000000',
        });
      }
    }
  }

  return { week, pharmacies };
}

export async function fetchOsmRegion(bbox: [number, number, number, number], city: string): Promise<OsmPharmacy[]> {
  const [south, west, north, east] = bbox;
  const query = `[out:json][timeout:45];(node["amenity"="pharmacy"](${south},${west},${north},${east});way["amenity"="pharmacy"](${south},${west},${north},${east}););out center;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PharmaVie/1.0' },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Overpass ${city}: HTTP ${res.status}`);
  const data = (await res.json()) as { elements?: Array<Record<string, unknown>> };
  const results: OsmPharmacy[] = [];
  for (const el of data.elements ?? []) {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const name = tags.name ?? tags['name:fr'];
    if (!name) continue;
    const lat = (el.lat as number) ?? (el.center as { lat: number })?.lat;
    const lon = (el.lon as number) ?? (el.center as { lon: number })?.lon;
    if (lat == null || lon == null) continue;
    results.push({
      osmId: `${el.type}/${el.id}`,
      name: name.startsWith('Pharmacie') ? name : `Pharmacie ${name}`,
      street: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || city,
      city: tags['addr:city'] ?? city,
      district: tags['addr:suburb'] ?? tags['addr:district'],
      latitude: lat,
      longitude: lon,
      phone: tags.phone ?? tags['contact:phone'],
    });
  }
  return results;
}

export async function fetchAnnuaireciDuty(): Promise<string> {
  const res = await fetch('https://annuaireci.com/pharmacies-de-garde/', {
    headers: { 'User-Agent': 'PharmaVie/1.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`annuaireci.com: HTTP ${res.status}`);
  return res.text();
}

export interface DutyImportResult {
  weekStart: Date;
  weekEnd: Date;
  total: number;
  linked: number;
  created: number;
}

export async function runDutyImport(
  prisma: {
    pharmacy: {
      findMany: (args: unknown) => Promise<Array<{ id: string; name: string; phone: string }>>;
      create: (args: unknown) => Promise<{ id: string }>;
    };
    pharmacyDutyWeek: { upsert: (args: unknown) => Promise<{ id: string }> };
    pharmacyDutyEntry: { deleteMany: (args: unknown) => Promise<unknown>; create: (args: unknown) => Promise<unknown> };
  },
  html: string,
  uniqueSlug: (base: string) => Promise<string>,
): Promise<DutyImportResult> {
  const { week, pharmacies } = parseAnnuaireciDuty(html);
  if (!week) throw new Error('Semaine de garde introuvable');

  const dutyWeek = (await prisma.pharmacyDutyWeek.upsert({
    where: { weekStart_weekEnd: { weekStart: week.weekStart, weekEnd: week.weekEnd } },
    update: { syncedAt: new Date() },
    create: { weekStart: week.weekStart, weekEnd: week.weekEnd, source: 'UNPPCI/annuaireci' },
  } as never)) as { id: string };

  await prisma.pharmacyDutyEntry.deleteMany({ where: { dutyWeekId: dutyWeek.id } });

  let linked = 0;
  let created = 0;
  for (const d of pharmacies) {
    const norm = normalizeName(d.name);
    const candidates = (await prisma.pharmacy.findMany({
      where: {
        OR: [
          { district: { contains: d.district.split(' ')[0], mode: 'insensitive' } },
          { city: { equals: d.city, mode: 'insensitive' } },
        ],
      },
      take: 500,
    } as never)) as Array<{ id: string; name: string; phone: string }>;

    let pharmacy = candidates.find((p) => normalizeName(p.name) === norm);
    if (!pharmacy && d.phone) {
      const pPhone = d.phone.replace(/\D/g, '').slice(-8);
      pharmacy = candidates.find((p) => p.phone.replace(/\D/g, '').slice(-8) === pPhone);
    }
    if (!pharmacy) {
      const coords = coordsForDistrict(d.district, d.city, d.name);
      pharmacy = await prisma.pharmacy.create({
        data: {
          name: d.name,
          slug: await uniqueSlug(`${d.name}-${d.district}`),
          street: d.street ?? `${d.district}, ${d.city}`,
          city: d.city,
          district: d.district,
          sector: d.sector,
          latitude: coords.lat,
          longitude: coords.lng,
          phone: d.phone ?? '+2250000000000',
          source: 'UNPPCI',
          openTime: '08:00',
          closeTime: '20:00',
        },
      } as never) as { id: string; name: string; phone: string };
      created += 1;
    } else {
      linked += 1;
    }
    await prisma.pharmacyDutyEntry.create({
      data: {
        dutyWeekId: dutyWeek.id,
        pharmacyId: pharmacy!.id,
        name: d.name,
        district: d.district,
        city: d.city,
        street: d.street,
        phone: d.phone,
      },
    } as never);
  }
  return { weekStart: week.weekStart, weekEnd: week.weekEnd, total: pharmacies.length, linked, created };
}
