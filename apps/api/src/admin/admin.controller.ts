import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { SpecialistsService } from '../specialists/specialists.service';
import { PharmacySyncService } from '../pharmacies/pharmacy-sync.service';
import { CreateSpecialistDto, UpdateSpecialistDto } from '../specialists/dto/specialist.dto';
import {
  AdminAssignStaffDto,
  AdminUpdatePharmacyDto,
  AdminUpdateUserDto,
  CreatePharmacyDto,
} from './dto/admin.dto';
import { Roles } from '../common/decorators/auth.decorators';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly specialistsService: SpecialistsService,
    private readonly pharmacySyncService: PharmacySyncService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('pharmacies')
  listPharmacies(@Query('activeOnly') activeOnly?: string, @Query('q') q?: string) {
    return this.adminService.listPharmacies(activeOnly !== 'true', q);
  }

  @Post('pharmacies')
  createPharmacy(@Body() dto: CreatePharmacyDto) {
    return this.adminService.createPharmacy(dto);
  }

  @Patch('pharmacies/:id')
  updatePharmacy(@Param('id') id: string, @Body() dto: AdminUpdatePharmacyDto) {
    return this.adminService.updatePharmacy(id, dto);
  }

  @Post('pharmacies/:id/staff')
  assignStaff(@Param('id') id: string, @Body() dto: AdminAssignStaffDto) {
    return this.adminService.assignStaff(id, dto);
  }

  @Get('orders')
  listOrders(@Query('limit') limit?: string) {
    return this.adminService.listOrders(limit ? parseInt(limit, 10) : 100);
  }

  @Get('users')
  listUsers(@Query('role') role?: UserRole) {
    return this.adminService.listUsers(role);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('prescriptions')
  listPrescriptions() {
    return this.adminService.listPrescriptions();
  }

  @Get('specialists')
  listSpecialists(@Query('activeOnly') activeOnly?: string) {
    return this.specialistsService.findAllAdmin(activeOnly !== 'true');
  }

  @Post('specialists')
  createSpecialist(@Body() dto: CreateSpecialistDto) {
    return this.specialistsService.create(dto);
  }

  @Patch('specialists/:id')
  updateSpecialist(@Param('id') id: string, @Body() dto: UpdateSpecialistDto) {
    return this.specialistsService.update(id, dto);
  }

  @Delete('specialists/:id')
  deleteSpecialist(@Param('id') id: string) {
    return this.specialistsService.remove(id);
  }

  @Get('pharmacies/duty-status')
  pharmacyDutyStatus() {
    return this.pharmacySyncService.getDutyStatus();
  }

  @Post('pharmacies/sync-duty')
  syncPharmacyDuty() {
    return this.pharmacySyncService.syncDutyFromUnppci();
  }
}
