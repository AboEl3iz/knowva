import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class QuestionAnswerDto {
    @IsNotEmpty()
    @IsNumber()
    questionId: number;

    @IsNotEmpty()
    @IsString()
    answer: string;
}