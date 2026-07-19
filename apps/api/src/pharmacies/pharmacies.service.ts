import { ForbiddenException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { UpdatePharmacyDto } from './dto/pharmacy.dto';
import { PharmacyDutyService } from './pharmacy-duty.service';

interface FindAllParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  isOnDuty?: boolean;
  city?: string;
  district?: string;
  q?: string;
}

@Injectable()
export class PharmaciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dutyService: PharmacyDutyService,
  ) {}

  async findAll(params: FindAllParams) {
    const [onDutyIds, hasDutyWeek] = await Promise.all([
      this.dutyService.getOnDutyPharmacyIds(),
      this.dutyService.hasActiveDutyWeek(),
    ]);

    const q = params.q?.trim();
    const searchFilter = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { street: { contains: q, mode: 'insensitive' as const } },
            { city: { contains: q, mode: 'insensitive' as const } },
            { district: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const pharmacies = await this.prisma.pharmacy.findMany({
      where: {
        isActive: true,
        ...searchFilter,
        ...(params.city ? this.cityWhere(params.city) : {}),
        ...(params.district
          ? { district: { contains: params.district, mode: 'insensitive' } }
          : {}),
      },
      include: {
        _count: { select: { products: { where: { isAvailable: true } } } },
      },
      orderBy: { rating: 'desc' },
    });

    const withDuty = pharmacies.map((pharmacy) => ({
      ...pharmacy,
      isOnDuty: hasDutyWeek ? onDutyIds.has(pharmacy.id) : pharmacy.isOnDuty,
      distanceKm:
        params.lat != null && params.lng != null
          ? this.haversineKm(params.lat, params.lng, pharmacy.latitude, pharmacy.longitude)
          : undefined,
      availableProducts: pharmacy._count.products,
    }));

    let filtered = withDuty;
    if (params.isOnDuty) {
      filtered = filtered.filter((p) => p.isOnDuty);
    }

    if (params.lat != null && params.lng != null && !q) {
      filtered = filtered.filter((p) => (p.distanceKm ?? Infinity) <= (params.radiusKm ?? 25));
    }

    if (q) {
      const lower = q.toLowerCase();
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(lower) ? 0 : 1;
        const bStarts = bName.startsWith(lower) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name, 'fr');
      });
    } else {
      filtered.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }

    return {
      success: true,
      data: filtered.map(({ _count, ...rest }) => rest),
      meta: {
        dutySource: hasDutyWeek ? 'UNPPCI' : 'manual',
        onDutyCount: filtered.filter((p) => p.isOnDuty).length,
      },
    };
  }

  async findCities() {
    const rows = await this.prisma.pharmacy.findMany({
      where: { isActive: true },
      select: { city: true, district: true },
    });

    const canonical = new Set<string>();
    for (const row of rows) {
      canonical.add(this.canonicalCity(row.city, row.district));
    }

    const priority = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Daloa', 'San-Pédro', 'Korhogo', 'Gagnoa', 'Man'];
    const sorted = [...canonical].sort((a, b) => {
      const ai = priority.indexOf(a);
      const bi = priority.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b, 'fr');
    });

    return { success: true, data: sorted };
  }

  async findDistricts(city?: string) {
    if (!city) {
      return { success: true, data: [] };
    }

    const rows = await this.prisma.pharmacy.findMany({
      where: {
        isActive: true,
        ...this.cityWhere(city),
        district: { not: null },
      },
      select: { district: true },
    });

    const districts = new Set<string>();
    for (const row of rows) {
      const d = this.cleanDistrict(row.district ?? '');
      if (d) districts.add(d);
    }

    if (city.toLowerCase() === 'abidjan') {
      for (const d of ['Cocody', 'Yopougon', 'Plateau', 'Marcory', 'Abobo', 'Koumassi', 'Adjamé', 'Treichville', 'Riviera', 'Port-Bouët']) {
        districts.add(d);
      }
    }

    return { success: true, data: [...districts].sort((a, b) => a.localeCompare(b, 'fr')) };
  }

  private cityWhere(city: string) {
    return {
      OR: [
        { city: { equals: city, mode: 'insensitive' as const } },
        { city: { contains: city, mode: 'insensitive' as const } },
        { district: { contains: city, mode: 'insensitive' as const } },
      ],
    };
  }

  private canonicalCity(city: string, district?: string | null): string {
    const c = city.trim().toLowerCase();
    if (c.includes('abidjan') || c.includes('cocody') || c.includes('yopougon')) return 'Abidjan';
    if (c === 'bouake' || c === 'bouaké') return 'Bouaké';
    if (c.includes('yamoussoukro')) return 'Yamoussoukro';
    if (c.includes('san') && c.includes('pedro')) return 'San-Pédro';
    if (c.includes('daloa')) return 'Daloa';
    if (c.includes('korhogo')) return 'Korhogo';
    if (district && district.length > 2 && c.length < 4) return 'Abidjan';
    return city.trim().charAt(0).toUpperCase() + city.trim().slice(1);
  }

  private cleanDistrict(raw: string): string {
    let s = raw.trim().replace(/^abidjan[\s\-]*/i, '');
    if (!s) return raw.trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async findOne(id: string) {
    const [pharmacy, onDutyIds, hasDutyWeek] = await Promise.all([
      this.prisma.pharmacy.findUnique({
        where: { id },
        include: {
          products: {
            where: { isAvailable: true },
            include: { product: true },
            take: 20,
          },
        },
      }),
      this.dutyService.getOnDutyPharmacyIds(),
      this.dutyService.hasActiveDutyWeek(),
    ]);

    if (!pharmacy) {
      throw new NotFoundException('Pharmacie introuvable');
    }

    return {
      success: true,
      data: {
        ...pharmacy,
        isOnDuty: hasDutyWeek ? onDutyIds.has(pharmacy.id) : pharmacy.isOnDuty,
      },
    };
  }

  async findProducts(pharmacyId: string, query?: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacie introuvable');
    }

    const products = await this.prisma.pharmacyProduct.findMany({
      where: {
        pharmacyId,
        isAvailable: true,
        quantity: { gt: 0 },
        ...(query
          ? {
              product: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { dci: { contains: query, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    });

    return {
      success: true,
      data: products.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        dci: item.product.dci,
        price: item.price,
        quantity: item.quantity,
        requiresRx: item.product.requiresRx,
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
      })),
    };
  }

  async update(id: string, user: AuthUser, dto: UpdatePharmacyDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');

    if (user.role !== 'ADMIN' && user.pharmacyId !== id) {
      throw new ForbiddenException('Accès refusé');
    }

    if (dto.latitude != null || dto.longitude != null) {
      const lat = dto.latitude ?? pharmacy.latitude;
      const lng = dto.longitude ?? pharmacy.longitude;
      if (lat < 4 || lat > 11 || lng < -9 || lng > -2) {
        throw new BadRequestException(
          'Coordonnées GPS invalides pour la Côte d\'Ivoire (lat 4–11, lng -9 à -2)',
        );
      }
    }

    const updated = await this.prisma.pharmacy.update({
      where: { id },
      data: dto,
    });
    return { success: true, data: updated };
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
