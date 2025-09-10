import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class StudentFeedbackDto {
    @IsNotEmpty()
    @IsNumber()
    answerId: number;

    @IsNotEmpty()
    @IsString()
    feedback: string;
}