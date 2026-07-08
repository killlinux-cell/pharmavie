import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/orders.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('pharmacyId') pharmacyId?: string) {
    return this.ordersService.findAll(user, pharmacyId);
  }

  @Get('stats')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  async stats(@CurrentUser() user: AuthUser, @Query('pharmacyId') pharmacyId?: string) {
    const id = pharmacyId ?? user.pharmacyId ?? (await this.ordersService.resolvePharmacyId(user));
    if (!id) throw new BadRequestException('pharmacyId requis');
    return this.ordersService.getStats(id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ordersService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, id, dto);
  }
}
