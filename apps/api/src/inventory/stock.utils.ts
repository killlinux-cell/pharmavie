import { Prisma } from '@prisma/client';

/** Met à jour isAvailable selon la quantité restante. */
export function stockUpdateData(quantity: number, isAvailable?: boolean): Prisma.PharmacyProductUpdateInput {
  const q = Math.max(0, quantity);
  return {
    quantity: q,
    isAvailable: isAvailable !== undefined ? isAvailable && q > 0 : q > 0,
  };
}

export function isInStock(quantity: number, isAvailable: boolean): boolean {
  return quantity > 0 && isAvailable;
}
