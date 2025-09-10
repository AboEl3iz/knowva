import { IsNotEmpty, IsString, IsDateString, IsNumber, Length, IsIn } from "class-validator";

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
    @IsString()
    @Length(2)
    @IsIn(["en", "ar"])
    language: "en" | "ar";

    @IsNotEmpty()
    @IsDateString()
    startsAt: Date;

    @IsNotEmpty()
    @IsDateString()
    endsAt: Date;

    @IsNotEmpty()
    @IsNumber()
    durationMins: number;
}
