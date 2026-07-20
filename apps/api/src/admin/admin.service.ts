import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PrescriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password.util';
import { InventorySeedService } from '../inventory/inventory-seed.service';
import {
  AdminAssignStaffDto,
  AdminUpdatePharmacyDto,
  AdminUpdateUserDto,
  CreatePharmacyDto,
} from './dto/admin.dto';

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Nouvelle',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  DELIVERING: 'En livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  REJECTED: 'Refusée',
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventorySeed: InventorySeedService,
  ) {}

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pharmaciesTotal,
      pharmaciesActive,
      pharmaciesOnDuty,
      usersTotal,
      clientsCount,
      pharmacistsCount,
      productsCount,
      ordersToday,
      ordersPending,
      revenueToday,
      prescriptionsPending,
      recentOrders,
    ] = await Promise.all([
      this.prisma.pharmacy.count(),
      this.prisma.pharmacy.count({ where: { isActive: true } }),
      this.prisma.pharmacy.count({ where: { isOnDuty: true, isActive: true } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.CLIENT } }),
      this.prisma.user.count({ where: { role: { in: [UserRole.PHARMACIST, UserRole.PHARMACY_STAFF] } } }),
      this.prisma.product.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PREPARING] } },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: today }, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] } },
        _sum: { total: true },
      }),
      this.prisma.prescription.count({ where: { status: PrescriptionStatus.PENDING } }),
      this.prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          pharmacy: { select: { name: true, district: true } },
          user: { select: { phone: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    const ordersByDistrict = await this.prisma.order.groupBy({
      by: ['pharmacyId'],
      _count: { id: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    const pharmacyIds = ordersByDistrict.map((o) => o.pharmacyId);
    const pharmacies = await this.prisma.pharmacy.findMany({
      where: { id: { in: pharmacyIds } },
      select: { id: true, name: true, district: true, latitude: true, longitude: true },
    });

    const heatmap = ordersByDistrict.map((o) => {
      const ph = pharmacies.find((p) => p.id === o.pharmacyId);
      return {
        pharmacyId: o.pharmacyId,
        pharmacyName: ph?.name ?? '—',
        district: ph?.district ?? '—',
        lat: ph?.latitude,
        lng: ph?.longitude,
        orders: o._count.id,
      };
    });

    return {
      success: true,
      data: {
        pharmaciesTotal,
        pharmaciesActive,
        pharmaciesOnDuty,
        usersTotal,
        clientsCount,
        pharmacistsCount,
        productsCount,
        ordersToday,
        ordersPending,
        revenueToday: revenueToday._sum.total ?? 0,
        prescriptionsPending,
        heatmap,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          statusLabel: STATUS_LABELS[o.status],
          total: o.total,
          pharmacyName: o.pharmacy.name,
          district: o.pharmacy.district,
          clientName: [o.user.firstName, o.user.lastName].filter(Boolean).join(' ') || o.user.phone,
          createdAt: o.createdAt,
        })),
      },
    };
  }

  async listPharmacies(includeInactive = true, query?: string) {
    const q = query?.trim();
    const searchFilter = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
            { street: { contains: q, mode: 'insensitive' as const } },
            { city: { contains: q, mode: 'insensitive' as const } },
            { district: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const pharmacies = await this.prisma.pharmacy.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(searchFilter ?? {}),
      },
      include: {
        _count: { select: { products: true, orders: true, staff: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: pharmacies.map(({ _count, ...p }) => ({
        ...p,
        productsCount: _count.products,
        ordersCount: _count.orders,
        staffCount: _count.staff,
      })),
    };
  }

  async createPharmacy(dto: CreatePharmacyDto) {
    this.validateCoords(dto.latitude, dto.longitude);

    const baseSlug = this.slugify(dto.name);
    let slug = baseSlug;
    let attempt = 0;
    while (await this.prisma.pharmacy.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const wantsStaff = Boolean(dto.staffUsername?.trim() && dto.staffPassword);
    if (dto.staffPassword && !dto.staffUsername?.trim()) {
      throw new BadRequestException('Pseudo pharmacien requis avec le mot de passe');
    }

    let staffUsername: string | undefined;
    let staffEmail: string | undefined;
    let staffPhone: string | undefined;

    if (wantsStaff) {
      staffUsername = dto.staffUsername!.trim().toLowerCase();
      staffEmail = (dto.staffEmail?.trim() || dto.email?.trim() || `${staffUsername}@pharmavie.space`).toLowerCase();
      staffPhone = dto.staffPhone?.trim() || dto.phone.trim();

      const conflict = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: staffUsername },
            { email: staffEmail },
            { phone: staffPhone },
          ],
        },
      });
      if (conflict) {
        throw new BadRequestException(
          'Un compte existe déjà avec ce pseudo, email ou téléphone. Utilisez des identifiants uniques.',
        );
      }
    }

    const passwordHash = wantsStaff ? await hashPassword(dto.staffPassword!) : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const pharmacy = await tx.pharmacy.create({
        data: {
          name: dto.name,
          slug,
          phone: dto.phone,
          street: dto.street,
          city: dto.city ?? 'Abidjan',
          district: dto.district,
          email: dto.email,
          latitude: dto.latitude,
          longitude: dto.longitude,
          openTime: dto.openTime ?? '08:00',
          closeTime: dto.closeTime ?? '20:00',
          licenseNo: dto.licenseNo,
          description: dto.description,
        },
      });

      let staffAccount: {
        id: string;
        username: string | null;
        email: string | null;
        phone: string;
      } | null = null;

      if (wantsStaff && passwordHash && staffUsername && staffEmail && staffPhone) {
        staffAccount = await tx.user.create({
          data: {
            phone: staffPhone,
            email: staffEmail,
            username: staffUsername,
            passwordHash,
            firstName: dto.staffFirstName?.trim() || dto.name.split(' ').slice(-1)[0],
            lastName: dto.staffLastName?.trim() || 'Pharmacie',
            role: UserRole.PHARMACIST,
          },
          select: { id: true, username: true, email: true, phone: true },
        });

        await tx.pharmacyStaff.create({
          data: {
            userId: staffAccount.id,
            pharmacyId: pharmacy.id,
            role: UserRole.PHARMACIST,
          },
        });
      }

      return { pharmacy, staffAccount };
    });

    const inventoryLines = await this.inventorySeed.seedPharmacy(result.pharmacy.id, {
      onlyMissing: true,
    });

    return {
      success: true,
      data: {
        ...result.pharmacy,
        inventorySeeded: inventoryLines,
        staffAccount: result.staffAccount
          ? {
              username: result.staffAccount.username,
              email: result.staffAccount.email,
              phone: result.staffAccount.phone,
              loginUrl: 'https://pharmavie.space/login',
            }
          : null,
      },
    };
  }

  async updatePharmacy(id: string, dto: AdminUpdatePharmacyDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id } });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');

    if (dto.latitude != null || dto.longitude != null) {
      const lat = dto.latitude ?? pharmacy.latitude;
      const lng = dto.longitude ?? pharmacy.longitude;
      this.validateCoords(lat, lng);
    }

    const updated = await this.prisma.pharmacy.update({ where: { id }, data: dto });
    return { success: true, data: updated };
  }

  private validateCoords(latitude: number, longitude: number) {
    if (latitude < 4 || latitude > 11 || longitude < -9 || longitude > -2) {
      throw new BadRequestException(
        'Coordonnées GPS invalides pour la Côte d\'Ivoire (lat 4–11, lng -9 à -2)',
      );
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'pharmacie';
  }

  async listOrders(limit = 100) {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        pharmacy: { select: { id: true, name: true, district: true } },
        user: { select: { phone: true, firstName: true, lastName: true } },
        payment: { select: { method: true, status: true } },
      },
    });

    return {
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: STATUS_LABELS[o.status],
        total: o.total,
        type: o.type,
        pharmacyName: o.pharmacy.name,
        pharmacyDistrict: o.pharmacy.district,
        clientName: [o.user.firstName, o.user.lastName].filter(Boolean).join(' ') || o.user.phone,
        clientPhone: o.user.phone,
        paymentMethod: o.payment?.method,
        paymentStatus: o.payment?.status,
        createdAt: o.createdAt,
      })),
    };
  }

  async listUsers(role?: UserRole) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      include: {
        pharmacyStaff: {
          include: { pharmacy: { select: { id: true, name: true } } },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        phone: u.phone,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        ordersCount: u._count.orders,
        pharmacies: u.pharmacyStaff.map((s) => ({
          id: s.pharmacy.id,
          name: s.pharmacy.name,
          role: s.role,
        })),
        createdAt: u.createdAt,
      })),
    };
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const updated = await this.prisma.user.update({ where: { id }, data: dto });
    return { success: true, data: updated };
  }

  async assignStaff(pharmacyId: string, dto: AdminAssignStaffDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const staff = await this.prisma.pharmacyStaff.upsert({
      where: { userId_pharmacyId: { userId: dto.userId, pharmacyId } },
      update: { role: dto.role ?? UserRole.PHARMACIST },
      create: {
        userId: dto.userId,
        pharmacyId,
        role: dto.role ?? UserRole.PHARMACIST,
      },
    });

    if (user.role === UserRole.CLIENT) {
      await this.prisma.user.update({
        where: { id: dto.userId },
        data: { role: dto.role ?? UserRole.PHARMACIST },
      });
    }

    return { success: true, data: staff };
  }

  async listPrescriptions() {
    const prescriptions = await this.prisma.prescription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { phone: true, firstName: true, lastName: true } },
      },
    });
    return { success: true, data: prescriptions };
  }
}
