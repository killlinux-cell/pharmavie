/**
 * Peuple l'inventaire de toutes les pharmacies actives avec le catalogue complet.
 *
 * Usage:
 *   npm run inventory:seed
 *   npm run inventory:seed -- --limit=100      # limiter pharmacies (test)
 *   npm run inventory:seed -- --products=500   # limiter produits (legacy)
 *   npm run inventory:seed -- --only-missing   # ajouter sans écraser l'existant
 */
import { PrismaClient } from '@prisma/client';
import { seedAllPharmaciesInventory } from '../../src/common/inventory-seed.util';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const productsArg = args.find((a) => a.startsWith('--products='));
  const onlyMissing = args.includes('--only-missing');
  const pharmacyLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const productLimit = productsArg ? parseInt(productsArg.split('=')[1], 10) : undefined;

  console.log('🏪 PharmaVie — Seed inventaire pharmacies (catalogue complet)\n');

  const productCount = await prisma.product.count();
  if (!productCount) {
    console.error('Aucun produit en base. Lancez npm run import:medprym ou db:seed d\'abord.');
    process.exit(1);
  }

  console.log(`→ ${productLimit ?? productCount} produits max × pharmacies actives`);
  if (onlyMissing) console.log('→ Mode only-missing : conserve prix/stock existants\n');

  const { pharmacies, lines } = await seedAllPharmaciesInventory(prisma, {
    pharmacyLimit,
    productLimit,
    onlyMissing,
  });

  const total = await prisma.pharmacyProduct.count();
  console.log(`\n✅ Terminé : ${lines} lignes traitées, ${pharmacies} pharmacies, ${total} lignes inventaire totales`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
