import { Module } from '@nestjs/common';
import { PharmaciesController } from './pharmacies.controller';
import { PharmaciesService } from './pharmacies.service';
import { PharmacyDutyService } from './pharmacy-duty.service';
import { PharmacySyncService } from './pharmacy-sync.service';

@Module({
  controllers: [PharmaciesController],
  providers: [PharmaciesService, PharmacyDutyService, PharmacySyncService],
  exports: [PharmaciesService, PharmacyDutyService, PharmacySyncService],
})
export class PharmaciesModule {}
