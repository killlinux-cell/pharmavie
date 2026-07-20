/** Prix indicatif FCFA selon catégorie (MEDPRYM ne publie pas les prix publics) */
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
