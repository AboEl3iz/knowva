import { IsNotEmpty, IsString, IsDateString, IsNumber, IsBoolean, IsOptional } from "class-validator";

export class CreateQuizDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsNotEmpty()
    @IsNumber()
    subjectId: number;

    @IsNotEmpty()
    @IsNumber()
    groupId: number;

    @IsNotEmpty()
    @IsDateString()
    startsAt: Date;

    @IsNotEmpty()
    @IsDateString()
    endsAt: Date;

    @IsOptional()
    @IsBoolean()
    canChangeAnswer?: boolean;

    
    Duration: number
}
