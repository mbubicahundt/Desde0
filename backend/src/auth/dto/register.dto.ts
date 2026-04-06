import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { UserRole } from '../../common/request-user';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['BUYER', 'SELLER'])
  role!: UserRole;

  @IsOptional()
  @IsString()
  name?: string;
}
