import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Gender } from '@prisma/client';


export class UpdateAuthDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  phone?: string; // ✅ match schema

  @IsOptional()
  @IsEnum(Gender, { message: "Gender should be either 'MALE' or 'FEMALE'" })
  gender?: Gender;

  @IsOptional()
  bio?: string;
}

