import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PrescriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/orders.dto';
import { stockUpdateData } from '../inventory/stock.utils';

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

const PHARMACY_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  NEW: [OrderStatus.CONFIRMED, OrderStatus.REJECTED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.DELIVERING, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERING: [OrderStatus.DELIVERED],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateOrderDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: dto.pharmacyId, isActive: true },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');

    if (dto.type === 'DELIVERY' && !dto.deliveryAddress) {
      throw new BadRequestException('Adresse de livraison requise');
    }

    const lines: { productId: string; quantity: number; unitPrice: number; total: number; requiresRx: boolean }[] = [];
    let needsRx = false;

    for (const item of dto.items) {
      const stock = await this.prisma.pharmacyProduct.findFirst({
        where: {
          pharmacyId: dto.pharmacyId,
          productId: item.productId,
          isAvailable: true,
          quantity: { gte: item.quantity },
        },
        include: { product: true },
      });

      if (!stock) {
        throw new BadRequestException(`Produit indisponible ou stock insuffisant: ${item.productId}`);
      }

      if (stock.product.requiresRx) {
        needsRx = true;
      }

      lines.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: stock.price,
        total: stock.price * item.quantity,
        requiresRx: stock.product.requiresRx,
      });
    }

    if (needsRx) {
      if (!dto.prescriptionId) {
        throw new BadRequestException('Une ordonnance validée est requise pour ces médicaments');
      }
      const prescription = await this.prisma.prescription.findUnique({
        where: { id: dto.prescriptionId },
      });
      if (!prescription || prescription.userId !== user.id) {
        throw new BadRequestException('Ordonnance introuvable');
      }
      if (prescription.status !== PrescriptionStatus.VALIDATED) {
        throw new BadRequestException('Ordonnance non validée par la pharmacie');
      }
      if (prescription.pharmacyId && prescription.pharmacyId !== dto.pharmacyId) {
        throw new BadRequestException('Cette ordonnance a été validée par une autre pharmacie');
      }
    }

    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const deliveryFee = dto.type === 'DELIVERY' ? 1500 : 0;
    const total = subtotal + deliveryFee;
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          pharmacyId: dto.pharmacyId,
          type: dto.type,
          subtotal,
          deliveryFee,
          total,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          prescriptionId: needsRx ? dto.prescriptionId : null,
          items: {
            create: lines.map(({ productId, quantity, unitPrice, total }) => ({
              productId,
              quantity,
              unitPrice,
              total,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          pharmacy: { select: { id: true, name: true } },
        },
      });

      for (const line of lines) {
        const row = await tx.pharmacyProduct.findFirst({
          where: { pharmacyId: dto.pharmacyId, productId: line.productId },
        });
        if (row) {
          const newQty = Math.max(0, row.quantity - line.quantity);
          await tx.pharmacyProduct.update({
            where: { id: row.id },
            data: stockUpdateData(newQty, row.isAvailable),
          });
        }
      }

      return created;
    });

    return { success: true, data: this.formatOrder(order) };
  }

  async findAll(user: AuthUser, pharmacyId?: string) {
    const resolvedPharmacyId =
      pharmacyId ?? user.pharmacyId ?? (await this.resolvePharmacyId(user));

    const where =
      user.role === UserRole.CLIENT
        ? { userId: user.id }
        : { pharmacyId: resolvedPharmacyId };

    if (user.role !== UserRole.CLIENT && !where.pharmacyId) {
      throw new ForbiddenException('Pharmacie non associée à ce compte');
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        pharmacy: { select: { id: true, name: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { success: true, data: orders.map((o) => this.formatOrder(o)) };
  }

  async findOne(user: AuthUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        pharmacy: { select: { id: true, name: true } },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Commande introuvable');

    if (
      user.role === UserRole.CLIENT &&
      order.userId !== user.id
    ) {
      throw new ForbiddenException();
    }

    if (
      ['PHARMACIST', 'PHARMACY_STAFF'].includes(user.role) &&
      order.pharmacyId !== user.pharmacyId
    ) {
      throw new ForbiddenException();
    }

    return { success: true, data: this.formatOrder(order) };
  }

  async resolvePharmacyId(user: AuthUser): Promise<string | undefined> {
    if (user.pharmacyId) return user.pharmacyId;
    if (user.role === UserRole.ADMIN) {
      const first = await this.prisma.pharmacy.findFirst({ where: { isActive: true } });
      return first?.id;
    }
    const staff = await this.prisma.pharmacyStaff.findFirst({ where: { userId: user.id } });
    return staff?.pharmacyId;
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Commande introuvable');

    if (order.pharmacyId !== user.pharmacyId) {
      throw new ForbiddenException('Cette commande appartient à une autre pharmacie');
    }

    const allowed = PHARMACY_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${order.status} → ${dto.status} non autorisée`,
      );
    }

    const shouldRestoreStock =
      (dto.status === OrderStatus.REJECTED && order.status === OrderStatus.NEW) ||
      (dto.status === OrderStatus.CANCELLED &&
        ([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] as OrderStatus[]).includes(
          order.status,
        ));

    const updated = await this.prisma.$transaction(async (tx) => {
      if (shouldRestoreStock) {
        const items = await tx.orderItem.findMany({ where: { orderId: id } });
        for (const line of items) {
          const row = await tx.pharmacyProduct.findFirst({
            where: { pharmacyId: order.pharmacyId, productId: line.productId },
          });
          if (row) {
            const newQty = row.quantity + line.quantity;
            await tx.pharmacyProduct.update({
              where: { id: row.id },
              data: stockUpdateData(newQty, true),
            });
          }
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.reason ? `${order.notes ?? ''}\n[Refus] ${dto.reason}`.trim() : order.notes,
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          pharmacy: { select: { id: true, name: true } },
          payment: true,
        },
      });
    });

    return { success: true, data: this.formatOrder(updated) };
  }

  async getStats(pharmacyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, allProducts, lowStock, orders] = await Promise.all([
      this.prisma.order.count({
        where: { pharmacyId, createdAt: { gte: today } },
      }),
      this.prisma.pharmacyProduct.count({ where: { pharmacyId } }),
      this.prisma.pharmacyProduct.count({
        where: { pharmacyId, OR: [{ quantity: { lte: 10 } }, { isAvailable: false }] },
      }),
      this.prisma.order.findMany({
        where: { pharmacyId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
        select: { total: true },
      }),
    ]);

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);

    return {
      success: true,
      data: {
        todayOrders,
        totalProducts: allProducts,
        lowStock,
        todayRevenue: revenue,
        alerts: lowStock,
      },
    };
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const prefix = `PV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await this.prisma.order.count({
      where: { orderNumber: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private formatOrder(order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    type: string;
    subtotal: number;
    deliveryFee: number;
    total: number;
    deliveryAddress: string | null;
    notes: string | null;
    createdAt: Date;
    user: { id: string; firstName: string | null; lastName: string | null; phone: string };
    pharmacy: { id: string; name: string };
    items: { id: string; quantity: number; unitPrice: number; total: number; product: { name: string } }[];
    payment?: { status: string; method: string } | null;
  }) {
    return {
      ...order,
      totalAmount: order.total,
      statusLabel: STATUS_LABELS[order.status],
      clientName: [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || order.user.phone,
    };
  }
}
