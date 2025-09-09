import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { LessonType } from "@prisma/client";

export class CreateLessonDto {
    @IsString()
    @IsNotEmpty({message : "Title should not be empty"})
    title: string;

    @IsString()
    @IsNotEmpty({message : "Description should not be empty"})
    description: string;
    
}
