import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateAIQuestionsDto {
  @ApiProperty({ example: 1, description: "Quiz ID to attach generated questions" })
  @IsNotEmpty()
  @IsNumber()
  quizId: number;

  @ApiProperty({ example: 1, description: "Starting focus page in the PDF" })
  @IsNotEmpty()
  @IsNumber()
  startingFocusPage: number;

  @ApiProperty({ example: 10, description: "Ending focus page in the PDF" })
  @IsNotEmpty()
  @IsNumber()
  endingFocusPage: number;

  @ApiProperty({ example: 5, description: "Number of questions to generate from focus pages" })
  @IsNotEmpty()
  @IsNumber()
  noOfFocusQuestions: number;

  @ApiPropertyOptional({ example: 11, description: "Starting remain page in the PDF" })
  @IsOptional()
  @IsNumber()
  startingRemainPage?: number;

  @ApiPropertyOptional({ example: 20, description: "Ending remain page in the PDF" })
  @IsOptional()
  @IsNumber()
  endingRemainPage?: number;

  @ApiPropertyOptional({ example: 5, description: "Number of questions to generate from remain pages" })
  @IsOptional()
  @IsNumber()
  noOfRemainQuestions?: number;

  @ApiProperty({ example: "hard", enum: ["hard", "medium", "easy"], description: "Difficulty level of generated questions" })
  @IsNotEmpty()
  @IsString()
  @IsIn(["hard", "medium", "easy"])
  difficulty: "hard" | "medium" | "easy";

  @ApiProperty({ example: 60, description: "Ratio of MCQs in focus questions (0-100)" })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  mcqFocusRatio?: number;

  @ApiProperty({ example: 20, description: "Ratio of True/False in focus questions (0-100)" })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  tfFocusRatio?: number;

  @ApiProperty({ example: 20, description: "Ratio of written questions in focus questions (0-100)" })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  writtenFocusRatio?: number;

  @ApiPropertyOptional({ example: 50, description: "Ratio of MCQs in remain questions (0-100)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  mcqRemainRatio?: number;

  @ApiPropertyOptional({ example: 30, description: "Ratio of True/False in remain questions (0-100)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tfRemainRatio?: number;

  @ApiPropertyOptional({ example: 20, description: "Ratio of written questions in remain questions (0-100)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  writtenRemainRatio?: number;

  @ApiProperty({ example: "data/The Machine Learning Pipeline.pdf", description: "Path of uploaded PDF file" })
  @IsNotEmpty()
  @IsString()
  filePath: string;
}
