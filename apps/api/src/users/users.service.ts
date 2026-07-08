import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateAddressDto,
  CreateReviewDto,
  UpdateAddressDto,
  UpdateNotificationPrefsDto,
  UpdateProfileDto,
} from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return { success: true, data: updated };
  }

  async listAddresses(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { success: true, data: addresses };
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const address = await this.prisma.address.create({
      data: {
        userId,
        label: dto.label,
        street: dto.street,
        city: dto.city ?? 'Abidjan',
        district: dto.district,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: dto.isDefault ?? false,
      },
    });
    return { success: true, data: address };
  }

  async updateAddress(userId: string, id: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Adresse introuvable');
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const updated = await this.prisma.address.update({ where: { id }, data: dto });
    return { success: true, data: updated };
  }

  async deleteAddress(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Adresse introuvable');
    await this.prisma.address.delete({ where: { id } });
    return { success: true, data: { id, deleted: true } };
  }

  async listFavorites(userId: string) {
    const favorites = await this.prisma.favoritePharmacy.findMany({
      where: { userId },
      include: {
        pharmacy: {
          select: {
            id: true,
            name: true,
            street: true,
            district: true,
            latitude: true,
            longitude: true,
            isOnDuty: true,
            rating: true,
            reviewCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      data: favorites.map((f) => ({ ...f.pharmacy, pharmacyId: f.pharmacyId, favoritedAt: f.createdAt })),
    };
  }

  async addFavorite(userId: string, pharmacyId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');
    await this.prisma.favoritePharmacy.upsert({
      where: { userId_pharmacyId: { userId, pharmacyId } },
      update: {},
      create: { userId, pharmacyId },
    });
    return { success: true, data: { pharmacyId } };
  }

  async removeFavorite(userId: string, pharmacyId: string) {
    await this.prisma.favoritePharmacy.deleteMany({ where: { userId, pharmacyId } });
    return { success: true, data: { pharmacyId, removed: true } };
  }

  async listReviews(pharmacyId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { pharmacyId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        author: [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.phone,
      })),
    };
  }

  async createReview(user: AuthUser, pharmacyId: string, dto: CreateReviewDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');

    await this.prisma.review.upsert({
      where: { userId_pharmacyId: { userId: user.id, pharmacyId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: { userId: user.id, pharmacyId, rating: dto.rating, comment: dto.comment },
    });

    const agg = await this.prisma.review.aggregate({
      where: { pharmacyId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: {
        rating: Math.round((agg._avg.rating ?? dto.rating) * 10) / 10,
        reviewCount: agg._count.id,
      },
    });

    return { success: true, data: { pharmacyId, rating: dto.rating } };
  }

  async getNotificationPrefs(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return {
      success: true,
      data: prefs ?? {
        userId,
        orderStatus: true,
        promotions: false,
        reminders: true,
        pharmacyNews: false,
      },
    };
  }

  async updateNotificationPrefs(userId: string, dto: UpdateNotificationPrefsDto) {
    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        orderStatus: dto.orderStatus ?? true,
        promotions: dto.promotions ?? false,
        reminders: dto.reminders ?? true,
        pharmacyNews: dto.pharmacyNews ?? false,
      },
    });
    return { success: true, data: prefs };
  }
}
