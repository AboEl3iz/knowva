import { Gender } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateAuthDto {

    @IsNotEmpty({ message: "Name should not be empty" })
    @IsString()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsNotEmpty()
    @IsString()
    confirmPassword: string;

    @IsOptional()
    roleToken?: string;

    @IsOptional()
    phoneNumber?: string;

    @IsOptional()
    bio?: string;

    @IsOptional()
    @IsEnum(['male', 'female'], { message: "Gender should be either 'male' or 'female'" })
    gender: string
}
