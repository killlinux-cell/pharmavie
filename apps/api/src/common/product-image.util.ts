const CATEGORY_SLUGS: Record<string, string> = {
  'Gastro-entérologie': 'gastro',
  'Sang et coagulation': 'sang',
  Cardiologie: 'cardio',
  Dermatologie: 'dermato',
  'Gynécologie/Urologie': 'gyneco',
  Hormones: 'hormones',
  Antibiotique: 'antibiotique',
  Anticancéreux: 'oncologie',
  'Musculo-squelettique': 'musculo',
  'Neurologie/Psychiatrie': 'neuro',
  Antiparasitaire: 'antiparasitaire',
  Respiratoire: 'respiratoire',
  'Organes sensoriels': 'sensoriel',
  Divers: 'divers',
  Antalgique: 'antalgique',
  'Anti-inflammatoire': 'anti-inflammatoire',
  'Vitamines/Minéraux': 'vitamines',
  Vaccin: 'vaccin',
  Antipaludéen: 'antipaludeen',
  Antidiabétique: 'diabete',
  Médicament: 'medicament',
};

const NAME_OVERRIDES: [RegExp, string][] = [
  [/parac[ée]tamol|doliprane|efferalgan|dafalgan/i, 'antalgique'],
  [/ibuprof[èe]ne|voltarene|diclof[ée]nac/i, 'anti-inflammatoire'],
  [/amoxicilline|ospamox|augmentin|ciprofloxacine|azithromycine/i, 'antibiotique'],
  [/art[ée]m[ée]ther|art[ée]sunate|coartem|quinine/i, 'antipaludeen'],
  [/metformine|insuline|glibenclamide/i, 'diabete'],
  [/omeprazole|smecta|spasfon/i, 'gastro'],
  [/vitamine\s*[cd]|zinc|fer\s|acide folique/i, 'vitamines'],
];

export function categoryToImageSlug(category?: string | null): string {
  if (!category) return 'medicament';
  return CATEGORY_SLUGS[category] ?? 'medicament';
}

export function resolveProductImageSlug(
  category?: string | null,
  name?: string | null,
  dci?: string | null,
): string {
  const text = `${name ?? ''} ${dci ?? ''}`;
  for (const [pattern, slug] of NAME_OVERRIDES) {
    if (pattern.test(text)) return slug;
  }
  return categoryToImageSlug(category);
}

/** Chemin relatif servi par l'API (/uploads/products/...) */
export function productImagePath(
  category?: string | null,
  name?: string | null,
  dci?: string | null,
): string {
  const slug = resolveProductImageSlug(category, name, dci);
  return `/uploads/products/${slug}.png`;
}
