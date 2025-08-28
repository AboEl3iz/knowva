import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class verifyOtpDto {
    @IsEmail()
    @IsNotEmpty()
    email : string;
    @IsNotEmpty()
    @IsString()
    otp : string;
}