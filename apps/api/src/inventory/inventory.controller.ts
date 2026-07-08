import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { AddInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';

@Controller('pharmacies/:pharmacyId/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  list(
    @Param('pharmacyId') pharmacyId: string,
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
  ) {
    return this.inventoryService.list(pharmacyId, user, q);
  }

  @Patch(':inventoryId')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF)
  update(
    @Param('pharmacyId') pharmacyId: string,
    @Param('inventoryId') inventoryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(pharmacyId, inventoryId, user, dto);
  }

  @Post()
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF)
  add(
    @Param('pharmacyId') pharmacyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddInventoryDto,
  ) {
    return this.inventoryService.add(pharmacyId, user, dto);
  }

  @Delete(':inventoryId')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  remove(
    @Param('pharmacyId') pharmacyId: string,
    @Param('inventoryId') inventoryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventoryService.remove(pharmacyId, inventoryId, user);
  }
}
