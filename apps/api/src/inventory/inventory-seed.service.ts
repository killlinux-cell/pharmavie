import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  seedAllPharmaciesInventory,
  seedPharmacyInventory,
  type SeedPharmacyInventoryOptions,
} from '../common/inventory-seed.util';

@Injectable()
export class InventorySeedService {
  constructor(private readonly prisma: PrismaService) {}

  seedPharmacy(pharmacyId: string, options?: SeedPharmacyInventoryOptions) {
    return seedPharmacyInventory(this.prisma, pharmacyId, options);
  }

  seedAllPharmacies(options?: SeedPharmacyInventoryOptions & { pharmacyLimit?: number }) {
    return seedAllPharmaciesInventory(this.prisma, options);
  }
}
