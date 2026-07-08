import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
}
