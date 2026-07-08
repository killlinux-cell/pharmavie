import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isInStock } from '../inventory/stock.utils';
import { isBarcodeQuery, resolveBarcodeScan } from './barcode.utils';
import { CreatePriceReportDto } from './dto/price-report.dto';

interface SearchParams {
  query: string;
  lat?: number;
  lng?: number;
  city?: string;
  district?: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: SearchParams) {
    const query = params.query.trim();
    if (!query) {
      return { success: true, data: [] };
    }

    const productFilter = this.buildProductFilter(query);

    const results = await this.prisma.pharmacyProduct.findMany({
      where: {
        pharmacy: { isActive: true },
        product: productFilter,
      },
      include: {
        product: true,
        pharmacy: true,
      },
      take: 80,
    });

    const mapped = results.map((item) => this.mapPharmacyProduct(item, params));

    mapped.sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });

    let finalData = mapped.slice(0, 50);

    if (finalData.length === 0 && isBarcodeQuery(query)) {
      finalData = await this.searchCatalogByBarcode(query, params);
    }

    const response: {
      success: true;
      data: typeof finalData;
      meta?: { scannedBarcode?: string; hint?: string };
    } = { success: true, data: finalData };

    if (finalData.length === 0 && isBarcodeQuery(query)) {
      const resolved = resolveBarcodeScan(query);
      response.meta = {
        scannedBarcode: resolved.scanned,
        hint:
          'Ce code-barres fabricant n\'est pas encore référencé. Essayez la recherche par nom (ex: Efferalgan, Ospamox). Les codes internes PharmaVie commencent par 619.',
      };
    } else if (finalData.length > 0 && finalData.every((r) => !r.inStock)) {
      response.meta = {
        hint: 'Médicament reconnu mais indisponible dans les pharmacies proches pour le moment.',
      };
    }

    return response;
  }

  /** Comparateur de prix — regroupe les offres par médicament */
  async compare(params: SearchParams) {
    const query = params.query.trim();
    if (!query) {
      return { success: true, data: [] };
    }

    const results = await this.prisma.pharmacyProduct.findMany({
      where: {
        pharmacy: {
          isActive: true,
          ...(params.city ? this.cityFilter(params.city) : {}),
          ...(params.district ? { district: { contains: params.district, mode: 'insensitive' } } : {}),
        },
        product: this.buildProductFilter(query),
      },
      include: { product: true, pharmacy: true },
      take: 200,
    });

    const mapped = results.map((item) => this.mapPharmacyProduct(item, params));
    const groups = new Map<string, typeof mapped>();

    for (const offer of mapped) {
      const list = groups.get(offer.productId) ?? [];
      list.push(offer);
      groups.set(offer.productId, list);
    }

    const data = [...groups.entries()].map(([productId, offers]) => {
      const inStockOffers = offers.filter((o) => o.inStock);
      const priced = inStockOffers.length ? inStockOffers : offers;
      const prices = priced.map((o) => o.price).filter((p) => p > 0);
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      const spreadPct =
        minPrice > 0 && maxPrice > minPrice ? Math.round(((maxPrice - minPrice) / minPrice) * 100) : 0;

      const sorted = [...offers].sort((a, b) => {
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        if (a.price !== b.price) return a.price - b.price;
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      });

      return {
        productId,
        name: offers[0]?.name,
        dci: offers[0]?.dci,
        requiresRx: offers[0]?.requiresRx,
        offerCount: offers.length,
        inStockCount: inStockOffers.length,
        minPrice,
        maxPrice,
        avgPrice,
        spreadPct,
        offers: sorted,
        cheapest: sorted.find((o) => o.inStock && o.price > 0) ?? sorted[0],
      };
    });

    data.sort((a, b) => b.spreadPct - a.spreadPct || a.minPrice - b.minPrice);

    return {
      success: true,
      data,
      meta: {
        hint:
          data.length === 0
            ? 'Aucune offre trouvée. Lancez npm run inventory:seed pour peupler les pharmacies.'
            : undefined,
      },
    };
  }

  async reportPrice(userId: string, dto: CreatePriceReportDto) {
    const [pharmacy, product] = await Promise.all([
      this.prisma.pharmacy.findUnique({ where: { id: dto.pharmacyId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');
    if (!product) throw new NotFoundException('Produit introuvable');

    const report = await this.prisma.priceReport.create({
      data: {
        userId,
        pharmacyId: dto.pharmacyId,
        productId: dto.productId,
        reportedPrice: dto.reportedPrice,
        note: dto.note,
      },
    });

    return { success: true, data: report, message: 'Signalement enregistré. Merci pour votre vigilance.' };
  }

  private cityFilter(city: string): Prisma.PharmacyWhereInput {
    return {
      OR: [
        { city: { equals: city, mode: 'insensitive' } },
        { city: { contains: city, mode: 'insensitive' } },
        { district: { contains: city, mode: 'insensitive' } },
      ],
    };
  }

  private async searchCatalogByBarcode(query: string, params: SearchParams) {
    const productFilter = this.buildProductFilter(query);
    const products = await this.prisma.product.findMany({
      where: productFilter,
      take: 10,
    });

    if (!products.length) return [];

    const pharmacies = await this.prisma.pharmacy.findMany({
      where: { isActive: true },
      take: 3,
      orderBy: { name: 'asc' },
    });

    return products.flatMap((product) =>
      pharmacies.map((pharmacy, index) => ({
        id: `catalog-${product.id}-${pharmacy.id}`,
        productId: product.id,
        name: product.name,
        dci: product.dci,
        price: 0,
        quantity: 0,
        inStock: false,
        requiresRx: product.requiresRx,
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        pharmacyAddress: pharmacy.street,
        pharmacyLat: pharmacy.latitude,
        pharmacyLng: pharmacy.longitude,
        distanceKm:
          params.lat != null && params.lng != null
            ? this.haversineKm(params.lat, params.lng, pharmacy.latitude, pharmacy.longitude) + index * 0.01
            : undefined,
      })),
    );
  }

  private mapPharmacyProduct(
    item: {
      id: string;
      productId: string;
      price: number;
      quantity: number;
      isAvailable: boolean;
      pharmacyId: string;
      product: { name: string; dci: string | null; requiresRx: boolean };
      pharmacy: { name: string; street: string; latitude: number; longitude: number };
    },
    params: SearchParams,
  ) {
    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      dci: item.product.dci,
      price: item.price,
      quantity: item.quantity,
      inStock: isInStock(item.quantity, item.isAvailable),
      requiresRx: item.product.requiresRx,
      pharmacyId: item.pharmacyId,
      pharmacyName: item.pharmacy.name,
      pharmacyAddress: item.pharmacy.street,
      pharmacyLat: item.pharmacy.latitude,
      pharmacyLng: item.pharmacy.longitude,
      distanceKm:
        params.lat != null && params.lng != null
          ? this.haversineKm(
              params.lat,
              params.lng,
              item.pharmacy.latitude,
              item.pharmacy.longitude,
            )
          : undefined,
    };
  }

  private buildProductFilter(query: string): Prisma.ProductWhereInput {
    if (isBarcodeQuery(query)) {
      const resolved = resolveBarcodeScan(query);
      const or: Prisma.ProductWhereInput[] = [
        { barcode: { in: resolved.internalBarcodes.length ? resolved.internalBarcodes : [query] } },
      ];

      if (resolved.airpAuths.length) {
        or.push({ airpAuth: { in: resolved.airpAuths, mode: 'insensitive' } });
      }

      or.push({ barcode: query });
      return { OR: or };
    }

    return {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { dci: { contains: query, mode: 'insensitive' } },
        { barcode: query },
      ],
    };
  }

  async catalog(query?: string) {
    const products = await this.prisma.product.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { dci: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 50,
    });
    return { success: true, data: products };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
