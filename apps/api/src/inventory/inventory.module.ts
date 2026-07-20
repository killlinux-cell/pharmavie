import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventorySeedService } from './inventory-seed.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventorySeedService],
  exports: [InventorySeedService],
})
export class InventoryModule {}
