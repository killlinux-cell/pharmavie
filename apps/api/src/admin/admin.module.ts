import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SpecialistsModule } from '../specialists/specialists.module';
import { PharmaciesModule } from '../pharmacies/pharmacies.module';

@Module({
  imports: [SpecialistsModule, PharmaciesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
