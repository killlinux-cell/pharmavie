import { PrismaClient } from '@prisma/client';
import { EAN_TO_INTERNAL_BARCODE } from '../data/ean-aliases';

/** Importe les alias EAN fabricant → produits catalogue (scan caméra). */
export async function seedProductEans(prisma: PrismaClient) {
  let count = 0;

  for (const [ean, internalBarcode] of Object.entries(EAN_TO_INTERNAL_BARCODE)) {
    const product = await prisma.product.findFirst({
      where: { barcode: internalBarcode },
    });
    if (!product) continue;

    await prisma.productEan.upsert({
      where: { ean },
      create: { productId: product.id, ean, source: 'seed' },
      update: { productId: product.id },
    });
    count += 1;
  }

  return count;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedProductEans(prisma)
    .then((n) => console.log(`✓ ${n} codes EAN importés`))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
