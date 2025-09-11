import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { QuestionType } from "@prisma/client";

export class CreateQuestionDto {
  @ApiProperty({ example: "What is the capital of France?", description: "Question text" })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({
    example: "MCQ",
    enum: QuestionType,
    description: "Type of the question (MCQ, TRUE_FALSE, WRITTEN, etc.)"
  })
  @IsNotEmpty()
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({
    example: ["Paris", "London", "Berlin", "Madrid"],
    description: "Options for multiple-choice questions"
  })
  @IsOptional()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ example: "Paris", description: "Correct answer to the question" })
  @IsNotEmpty()
  @IsString()
  answer: string;

  @IsOptional()
  @IsNumber()
  score?: number;
}
