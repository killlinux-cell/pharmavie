import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { CreatePriceReportDto } from './dto/price-report.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get('search')
  search(
    @Query('q') q: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.productsService.search({
      query: q ?? '',
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    });
  }

  @Public()
  @Get('compare')
  compare(
    @Query('q') q: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
  ) {
    return this.productsService.compare({
      query: q ?? '',
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      city,
      district,
    });
  }

  @Post('price-reports')
  reportPrice(@CurrentUser() user: AuthUser, @Body() dto: CreatePriceReportDto) {
    return this.productsService.reportPrice(user.id, dto);
  }

  @Get('catalog')
  @Roles(UserRole.PHARMACIST, UserRole.PHARMACY_STAFF, UserRole.ADMIN)
  catalog(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.productsService.catalog(q, limit ? parseInt(limit, 10) : undefined);
  }
}
