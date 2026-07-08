import { Controller, Get, Query } from '@nestjs/common';
import { SpecialistsService } from './specialists.service';
import { Public } from '../common/decorators/auth.decorators';

@Controller('specialists')
export class SpecialistsController {
  constructor(private readonly specialistsService: SpecialistsService) {}

  @Public()
  @Get()
  findAll(
    @Query('specialty') specialty?: string,
    @Query('district') district?: string,
    @Query('q') q?: string,
  ) {
    return this.specialistsService.findAll({ specialty, district, q });
  }

  @Public()
  @Get('specialties')
  listSpecialties() {
    return this.specialistsService.listSpecialties();
  }
}
