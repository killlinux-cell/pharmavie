import type { PrismaClient } from '@prisma/client';
import { estimatePrice } from './estimate-price';

export interface SeedPharmacyInventoryOptions {
  /** Limite produits catalogue (undefined = tous) */
  productLimit?: number;
  /** Ne pas écraser prix/stock existants */
  onlyMissing?: boolean;
}

function hashFactor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 0.88 + (Math.abs(h) % 25) / 100;
}

function stockQty(pharmacyId: string, productId: string): number {
  return Math.max(0, Math.round(8 + (Math.abs(hashFactor(pharmacyId + productId).toString().length * 17) % 40)));
}

export async function seedPharmacyInventory(
  prisma: PrismaClient,
  pharmacyId: string,
  options: SeedPharmacyInventoryOptions = {},
): Promise<number> {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    ...(options.productLimit ? { take: options.productLimit } : {}),
    select: { id: true, category: true, requiresRx: true },
  });

  if (!products.length) return 0;

  const factor = hashFactor(pharmacyId);
  let count = 0;
  const batchSize = 200;

  if (options.onlyMissing) {
    const existing = await prisma.pharmacyProduct.findMany({
      where: { pharmacyId },
      select: { productId: true },
    });
    const existingSet = new Set(existing.map((e) => e.productId));
    const missing = products.filter((p) => !existingSet.has(p.id));

    for (let i = 0; i < missing.length; i += batchSize) {
      const chunk = missing.slice(i, i + batchSize);
      await prisma.pharmacyProduct.createMany({
        data: chunk.map((product) => {
          const base = estimatePrice(product.category ?? 'Médicament', product.requiresRx);
          const price = Math.round(base * factor);
          const qty = stockQty(pharmacyId, product.id);
          return {
            pharmacyId,
            productId: product.id,
            price,
            quantity: qty,
            isAvailable: qty > 0,
          };
        }),
        skipDuplicates: true,
      });
      count += chunk.length;
    }
    return count;
  }

  for (const product of products) {
    const base = estimatePrice(product.category ?? 'Médicament', product.requiresRx);
    const price = Math.round(base * factor);
    const qty = stockQty(pharmacyId, product.id);

    await prisma.pharmacyProduct.upsert({
      where: { pharmacyId_productId: { pharmacyId, productId: product.id } },
      update: { price, quantity: qty, isAvailable: qty > 0 },
      create: {
        pharmacyId,
        productId: product.id,
        price,
        quantity: qty,
        isAvailable: qty > 0,
      },
    });
    count++;
  }

  return count;
}

export async function seedAllPharmaciesInventory(
  prisma: PrismaClient,
  options: SeedPharmacyInventoryOptions & { pharmacyLimit?: number } = {},
): Promise<{ pharmacies: number; lines: number }> {
  let pharmacies = await prisma.pharmacy.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (options.pharmacyLimit) {
    pharmacies = pharmacies.slice(0, options.pharmacyLimit);
  }

  let lines = 0;
  for (const ph of pharmacies) {
    lines += await seedPharmacyInventory(prisma, ph.id, options);
  }

  return { pharmacies: pharmacies.length, lines };
}
