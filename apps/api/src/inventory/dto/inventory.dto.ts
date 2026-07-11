import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class AddInventoryDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  /** Code EAN-13 / GTIN scanné sur la boîte */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8,14}$/, { message: 'EAN/GTIN : 8 à 14 chiffres' })
  ean?: string;
}
