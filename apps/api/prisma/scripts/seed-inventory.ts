/**
 * Peuple l'inventaire de toutes les pharmacies actives avec un catalogue de base.
 *
 * Usage:
 *   npm run inventory:seed
 *   npm run inventory:seed -- --limit=100   # limiter pharmacies (test)
 *   npm run inventory:seed -- --products=80 # nb produits par pharmacie
 */
import { PrismaClient } from '@prisma/client';
import { estimatePrice } from './medprym-utils';

const prisma = new PrismaClient();

function hashFactor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 0.88 + (Math.abs(h) % 25) / 100;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const productsArg = args.find((a) => a.startsWith('--products='));
  const pharmacyLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const productLimit = productsArg ? parseInt(productsArg.split('=')[1], 10) : 500;

  console.log('🏪 PharmaVie — Seed inventaire pharmacies\n');

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    take: productLimit,
    select: { id: true, category: true, requiresRx: true, name: true },
  });

  if (!products.length) {
    console.error('Aucun produit en base. Lancez npm run db:seed ou import:medprym d\'abord.');
    process.exit(1);
  }

  let pharmacies = await prisma.pharmacy.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (pharmacyLimit) pharmacies = pharmacies.slice(0, pharmacyLimit);

  console.log(`→ ${products.length} produits × ${pharmacies.length} pharmacies`);

  let count = 0;
  const batchSize = 50;

  for (let pi = 0; pi < pharmacies.length; pi++) {
    const ph = pharmacies[pi];
    const factor = hashFactor(ph.id);

    for (const product of products) {
      const base = estimatePrice(product.category ?? 'Médicament', product.requiresRx);
      const price = Math.round(base * factor);
      const qty = Math.max(0, Math.round(8 + (Math.abs(hashFactor(ph.id + product.id).toString().length * 17) % 40)));

      await prisma.pharmacyProduct.upsert({
        where: { pharmacyId_productId: { pharmacyId: ph.id, productId: product.id } },
        update: { price, quantity: qty, isAvailable: qty > 0 },
        create: {
          pharmacyId: ph.id,
          productId: product.id,
          price,
          quantity: qty,
          isAvailable: qty > 0,
        },
      });
      count++;
    }

    if ((pi + 1) % batchSize === 0 || pi === pharmacies.length - 1) {
      console.log(`   ${pi + 1}/${pharmacies.length} pharmacies (${count} lignes)`);
    }
  }

  const total = await prisma.pharmacyProduct.count();
  console.log(`\n✅ Terminé : ${count} upserts, ${total} lignes inventaire totales`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
