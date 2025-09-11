import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateBy } from "class-validator";

export class GenerateAIQuestionsDto {
  @ApiProperty({ example: 1, description: "Quiz ID to attach generated questions" })
  @IsNotEmpty()
  @IsNumber()
  quizId: number;

  @ApiProperty({
    example: [5, 6],
    description: "Array of focus page numbers in the PDF",
    type: [Number]
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  focusPages: number[];

  @ApiProperty({ example: 10, description: "Number of questions to generate from focus pages" })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  noOfFocusQuestions: number;

  @ApiPropertyOptional({
    example: [2, 3],
    description: "Array of remain page numbers in the PDF",
    type: [Number]
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  remainPages?: number[];

  @ApiPropertyOptional({ example: 3, description: "Number of questions to generate from remain pages" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  noOfRemainQuestions?: number;

  @ApiProperty({
    example: "hard",
    enum: ["hard", "medium", "easy"],
    description: "Difficulty level of generated questions"
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(["hard", "medium", "easy"])
  difficulty: "hard" | "medium" | "easy";

  @ApiProperty({
    example: 0.6,
    description: "Ratio of MCQs in focus questions (0.0-1.0)",
    minimum: 0,
    maximum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  mcqFocusRatio: number;

  @ApiProperty({
    example: 0.2,
    description: "Ratio of True/False in focus questions (0.0-1.0)",
    minimum: 0,
    maximum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  tfFocusRatio: number;

  @ApiProperty({
    example: 0.2,
    description: "Ratio of written questions in focus questions (0.0-1.0)",
    minimum: 0,
    maximum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  writtenFocusRatio: number;

  @ApiPropertyOptional({
    example: 0.5,
    description: "Ratio of MCQs in remain questions (0.0-1.0)",
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  mcqRemainRatio?: number;

  @ApiPropertyOptional({
    example: 0.3,
    description: "Ratio of True/False in remain questions (0.0-1.0)",
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  tfRemainRatio?: number;

  @ApiPropertyOptional({
    example: 0.2,
    description: "Ratio of written questions in remain questions (0.0-1.0)",
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  writtenRemainRatio?: number;

  @ApiProperty({
    example: "https://arxiv.org/pdf/1706.03762",
    description: "URL or path of the PDF file"
  })
  @IsNotEmpty()
  @IsString()
  pdfPath: string;

  // Add validation to ensure ratios sum to 1.0
  @ValidateBy({
    name: 'ratiosSum',
    validator: {
      validate(value, args) {
        const obj = args?.object as GenerateAIQuestionsDto;
        const focusSum = obj.mcqFocusRatio + obj.tfFocusRatio + obj.writtenFocusRatio;
        return Math.abs(focusSum - 1.0) < 0.01; // Allow small floating point errors
      },
      defaultMessage() {
        return 'Focus question ratios must sum to 1.0';
      }
    }
  })
  focusRatiosValid?: boolean;

  @ValidateBy({
    name: 'remainRatiosSum',
    validator: {
      validate(value, args) {
        const obj = args?.object as GenerateAIQuestionsDto;
        if (obj.mcqRemainRatio !== undefined && obj.tfRemainRatio !== undefined && obj.writtenRemainRatio !== undefined) {
          const remainSum = obj.mcqRemainRatio + obj.tfRemainRatio + obj.writtenRemainRatio;
          return Math.abs(remainSum - 1.0) < 0.01; // Allow small floating point errors
        }
        return true; // If remain ratios are not all provided, skip validation
      },
      defaultMessage() {
        return 'Remain question ratios must sum to 1.0';
      }
    }
  })
  remainRatiosValid?: boolean;
}