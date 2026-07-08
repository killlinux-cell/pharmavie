import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PrescriptionStatus } from '@prisma/client';

export class UpdatePrescriptionStatusDto {
  @IsEnum(PrescriptionStatus)
  status!: PrescriptionStatus;

  @IsOptional()
  @IsString()
  rejectReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  pharmacyId?: string;
}
