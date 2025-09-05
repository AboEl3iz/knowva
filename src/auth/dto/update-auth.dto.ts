import { PartialType } from '@nestjs/mapped-types';
import { CreateAuthDto } from './create-auth.dto';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class UpdateAuthDto  {
    @IsOptional()
    name?: string;
    @IsOptional()
    @IsEmail()
    email?: string;
    @IsOptional()
    password?: string;
    
    @IsOptional()
    phoneNumber?: string;
    
    @IsOptional()
    bio?: string;
}
