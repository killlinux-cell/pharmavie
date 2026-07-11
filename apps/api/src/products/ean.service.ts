import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { barcodeVariants, normalizeBarcode, resolveBarcodeScan } from './barcode.utils';

@Injectable()
export class EanService {
  constructor(private readonly prisma: PrismaService) {}

  async register(productId: string, raw: string, source = 'manual') {
    const variants = barcodeVariants(raw);
    const ean = variants.find((v) => v.length >= 8 && v.length <= 14) ?? normalizeBarcode(raw);
    if (!ean || ean.length < 8 || ean.length > 14) {
      throw new BadRequestException('Code EAN/GTIN invalide (8 à 14 chiffres)');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BadRequestException('Produit introuvable');

    for (const variant of variants) {
      if (variant.length < 8 || variant.length > 14) continue;
      await this.prisma.productEan.upsert({
        where: { ean: variant },
        create: { productId, ean: variant, source },
        update: { productId, source },
      });
    }

    return { productId, ean, variants };
  }

  async resolve(raw: string) {
    const staticResolved = resolveBarcodeScan(raw);
    const variants = barcodeVariants(raw);

    const dbMatches = await this.prisma.productEan.findMany({
      where: { ean: { in: variants } },
      include: { product: { select: { id: true, barcode: true, airpAuth: true } } },
    });

    const productIds = new Set<string>();
    const productBarcodes = new Set<string>(staticResolved.internalBarcodes);
    const airpAuths = new Set<string>(staticResolved.airpAuths);

    for (const match of dbMatches) {
      productIds.add(match.productId);
      if (match.product.barcode) productBarcodes.add(match.product.barcode);
      if (match.product.airpAuth) airpAuths.add(match.product.airpAuth.toUpperCase());
    }

    for (const v of variants) {
      if (v.startsWith('619')) productBarcodes.add(v);
    }

    return {
      productIds: [...productIds],
      productBarcodes: [...productBarcodes, ...variants],
      airpAuths: [...airpAuths],
      scanned: staticResolved.scanned,
    };
  }
}
