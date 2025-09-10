import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { QuestionType } from "@prisma/client";

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: "What is the capital of Italy?", description: "Updated question text" })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ example: "MCQ", enum: QuestionType, description: "Updated type of question" })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ example: ["Rome", "Paris", "Berlin", "Madrid"], description: "Updated options" })
  @IsOptional()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ example: "Rome", description: "Updated answer" })
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional({ example: 10, description: "Updated score" })
  @IsOptional()
  @IsNumber()
  score?: number;
}
