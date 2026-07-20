/**
 * Assigne imageUrl à tous les produits (illustrations par catégorie / nom).
 * Génère les PNG via generate-product-images.py
 *
 * Usage:
 *   npm run product-images:seed
 */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import { productImagePath, resolveProductImageSlug } from '../../src/common/product-image.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🖼️  PharmaVie — Images produits\n');

  const py = join(__dirname, 'generate-product-images.py');
  execSync(`python "${py}"`, { stdio: 'inherit' });

  const products = await prisma.product.findMany({
    select: { id: true, name: true, dci: true, category: true, imageUrl: true },
  });

  let updated = 0;
  for (const p of products) {
    const imageUrl = productImagePath(p.category, p.name, p.dci);
    if (p.imageUrl !== imageUrl) {
      await prisma.product.update({ where: { id: p.id }, data: { imageUrl } });
      updated++;
    }
  }

  console.log(`\n✅ ${updated}/${products.length} produits mis à jour (imageUrl)`);
  console.log(`   Exemple slug : ${resolveProductImageSlug(products[0]?.category, products[0]?.name)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
