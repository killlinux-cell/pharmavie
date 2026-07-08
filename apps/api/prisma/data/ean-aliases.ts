/**
 * Codes EAN/GTIN réels (boîtes) → code-barres interne PharmaVie (619…).
 * MEDPRYM/AIRP ne publie pas les EAN — enrichissement progressif.
 * Sources : VIDAL, pharmacies FR, distributeurs EU.
 */
export const EAN_TO_INTERNAL_BARCODE: Record<string, string> = {
  // EFFERALGAN 1000 mg cp effervescent B/8 (UPSA)
  '3400930096383': '6190000010003',
  '3009638': '6190000010003',

  // VOLTARENE 25 mg cp gastro-résistant B/30
  '3400933814458': '6190000010007',
  '3381445': '6190000010007',
  '3400931895299': '6190000010007',

  // VOLTARENE 100 mg suppositoire B/10
  '3400932214341': '6190000010008',
  '3221434': '6190000010008',

  // OSPAMOX 500 mg (codes EU — conditionnements variables selon pays)
  '5907626702460': '6190000010011',
  '5909990788453': '6190000010011',
  '9002260004669': '6190000010011',
  '9002260002641': '6190000010011',
};

/** EAN → numéro autorisation AIRP */
export const EAN_TO_AIRP_AUTH: Record<string, string> = {
  '3400930096383': 'E-2001-0018',
  '3400933814458': 'E-1976-1152',
  '3400932214341': 'E-1980-1617',
  '5907626702460': 'E-1983-0216',
  '9002260004669': 'E-1983-0216',
};
