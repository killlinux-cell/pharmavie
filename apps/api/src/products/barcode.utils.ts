import { EAN_TO_AIRP_AUTH, EAN_TO_INTERNAL_BARCODE } from '../../prisma/data/ean-aliases';

/** Extrait uniquement les chiffres du scan (EAN-13, UPC-A, Code 128 numérique). */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Variantes courantes : EAN-13, UPC-A (préfixe 0), code CIP court. */
export function barcodeVariants(raw: string): string[] {
  const digits = normalizeBarcode(raw);
  if (!digits) return [];

  const variants = new Set<string>([digits]);

  if (digits.length === 12) {
    variants.add(`0${digits}`);
  }
  if (digits.length === 13 && digits.startsWith('0')) {
    variants.add(digits.slice(1));
  }
  if (digits.length === 13 && digits.startsWith('340')) {
    variants.add(digits.slice(3));
  }

  return [...variants];
}

export function isBarcodeQuery(query: string): boolean {
  const digits = normalizeBarcode(query);
  return digits.length >= 8 && digits.length <= 14;
}

/** Résout un scan réel vers identifiants catalogue PharmaVie. */
export function resolveBarcodeScan(raw: string): {
  internalBarcodes: string[];
  airpAuths: string[];
  scanned: string;
} {
  const variants = barcodeVariants(raw);
  const internalBarcodes = new Set<string>();
  const airpAuths = new Set<string>();

  for (const v of variants) {
    const internal = EAN_TO_INTERNAL_BARCODE[v];
    if (internal) internalBarcodes.add(internal);

    const airp = EAN_TO_AIRP_AUTH[v];
    if (airp) airpAuths.add(airp.toUpperCase());

    if (v.startsWith('619')) internalBarcodes.add(v);
  }

  return {
    internalBarcodes: [...internalBarcodes],
    airpAuths: [...airpAuths],
    scanned: variants[0] ?? normalizeBarcode(raw),
  };
}
