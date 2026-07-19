import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PharmaciesService } from './pharmacies.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { UpdatePharmacyDto } from './dto/pharmacy.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('pharmacies')
export class PharmaciesController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  @Public()
  @Get('cities/list')
  listCities() {
    return this.pharmaciesService.findCities();
  }

  @Public()
  @Get('districts/list')
  listDistricts(@Query('city') city?: string) {
    return this.pharmaciesService.findDistricts(city);
  }

  @Public()
  @Get()
  findAll(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('isOnDuty') isOnDuty?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('q') q?: string,
  ) {
    const r = radius ?? radiusKm;
    return this.pharmaciesService.findAll({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: r ? parseFloat(r) : 25,
      isOnDuty: isOnDuty === 'true',
      city,
      district,
      q,
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmaciesService.findOne(id);
  }

  @Public()
  @Get(':id/products')
  findProducts(@Param('id') id: string, @Query('q') q?: string) {
    return this.pharmaciesService.findProducts(id, q);
  }

  @Patch(':id')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePharmacyDto,
  ) {
    return this.pharmaciesService.update(id, user, dto);
  }
}
