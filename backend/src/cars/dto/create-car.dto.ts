import {
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCarDto {
  @IsString()
  @MinLength(1)
  brand!: string;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsInt()
  @Min(0)
  mileage!: number;

  @IsIn(['GASOLINE', 'DIESEL', 'FLEX', 'HYBRID', 'ELECTRIC', 'GNV', 'OTHER'])
  fuel!: string;

  @IsIn(['MANUAL', 'AUTOMATIC'])
  transmission!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @MinLength(1)
  location!: string;

  @IsIn([
    'SEDAN',
    'COUPE',
    'SUV',
    'VAN',
    'HATCHBACK',
    'WAGON',
    'PICKUP',
    'CROSSOVER',
    'OTHER',
  ])
  bodyType!: string;

  @IsString()
  @MinLength(1)
  color!: string;

  @IsInt()
  @Min(0)
  ownersCount!: number;

  @IsString()
  @MinLength(1)
  description!: string;
}
