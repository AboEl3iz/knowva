import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class QuestionAnswerDto {
  @ApiProperty({ example: 101, description: "ID of the question being answered" })
  @IsNotEmpty()
  @IsNumber()
  questionId: number;

  @ApiProperty({ example: "Paris", description: "Student's submitted answer" })
  @IsNotEmpty()
  @IsString()
  answer: string;
}
