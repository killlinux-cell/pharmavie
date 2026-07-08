import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePriceReportDto {
  @IsString()
  pharmacyId!: string;

  @IsString()
  productId!: string;

  @IsInt()
  @Min(0)
  reportedPrice!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
