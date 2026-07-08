import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { AddInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
import { stockUpdateData } from './stock.utils';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private assertPharmacyAccess(user: AuthUser, pharmacyId: string) {
    if (user.pharmacyId && user.pharmacyId !== pharmacyId) {
      throw new ForbiddenException('Accès refusé à cette pharmacie');
    }
  }

  async list(pharmacyId: string, user: AuthUser, query?: string) {
    this.assertPharmacyAccess(user, pharmacyId);

    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');

    const items = await this.prisma.pharmacyProduct.findMany({
      where: {
        pharmacyId,
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
      data: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        dci: item.product.dci,
        category: item.product.category,
        requiresRx: item.product.requiresRx,
        price: item.price,
        quantity: item.quantity,
        isAvailable: item.isAvailable,
        lowStock: item.quantity <= 10,
      })),
    };
  }

  async update(
    pharmacyId: string,
    inventoryId: string,
    user: AuthUser,
    dto: UpdateInventoryDto,
  ) {
    this.assertPharmacyAccess(user, pharmacyId);

    const item = await this.prisma.pharmacyProduct.findFirst({
      where: { id: inventoryId, pharmacyId },
    });
    if (!item) throw new NotFoundException('Produit introuvable dans l\'inventaire');

    const nextQty = dto.quantity ?? item.quantity;
    const patch = {
      ...dto,
      ...stockUpdateData(nextQty, dto.isAvailable ?? item.isAvailable),
    };

    const updated = await this.prisma.pharmacyProduct.update({
      where: { id: inventoryId },
      data: patch,
      include: { product: true },
    });

    return { success: true, data: updated };
  }

  async remove(pharmacyId: string, inventoryId: string, user: AuthUser) {
    this.assertPharmacyAccess(user, pharmacyId);

    const item = await this.prisma.pharmacyProduct.findFirst({
      where: { id: inventoryId, pharmacyId },
    });
    if (!item) throw new NotFoundException('Produit introuvable dans l\'inventaire');

    await this.prisma.pharmacyProduct.delete({ where: { id: inventoryId } });
    return { success: true, data: { id: inventoryId, deleted: true } };
  }

  async add(pharmacyId: string, user: AuthUser, dto: AddInventoryDto) {
    this.assertPharmacyAccess(user, pharmacyId);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produit catalogue introuvable');

    const item = await this.prisma.pharmacyProduct.upsert({
      where: {
        pharmacyId_productId: { pharmacyId, productId: dto.productId },
      },
      update: {
        price: dto.price,
        ...stockUpdateData(dto.quantity, dto.isAvailable ?? true),
      },
      create: {
        pharmacyId,
        productId: dto.productId,
        price: dto.price,
        quantity: dto.quantity,
        isAvailable: dto.quantity > 0 && (dto.isAvailable ?? true),
      },
      include: { product: true },
    });

    return { success: true, data: item };
  }
}
