import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsArray, Min, Max, IsIn } from "class-validator";

export class GenerateQuizDto {
  @ApiProperty({ example: "en", enum: ["en", "ar"], description: "Language of the quiz" })
  @IsString()
  @IsIn(["en", "ar"])
  language: string;

  @ApiProperty({ example: "hard", enum: ["hard", "medium", "easy"], description: "Difficulty level" })
  @IsString()
  @IsIn(["hard", "medium", "easy"])
  level: string;

  @ApiProperty({ example: "data/The Machine Learning Pipeline.pdf", description: "Path to the uploaded PDF file" })
  @IsString()
  pdf_path: string;

  @ApiProperty({ example: 10, description: "Total number of questions to generate" })
  @IsNumber()
  n_questions: number;

  @ApiProperty({ example: 6, description: "Number of questions from focus pages" })
  @IsNumber()
  n_focus: number;

  @ApiProperty({ example: 4, description: "Number of questions from remain pages" })
  @IsNumber()
  n_remain: number;

  @ApiProperty({ example: [1, 2, 3], description: "Pages to focus on for question generation" })
  @IsArray()
  @IsNumber({}, { each: true })
  focus_pages: number[];

  @ApiProperty({ example: [4, 5, 6], description: "Pages to take as remaining for question generation" })
  @IsArray()
  @IsNumber({}, { each: true })
  remain_pages: number[];

  @ApiProperty({ example: 0.6, minimum: 0, maximum: 1, description: "MCQ ratio in focus questions" })
  @IsNumber()
  @Min(0)
  @Max(1)
  f_mcq_ratio: number;

  @ApiProperty({ example: 0.2, minimum: 0, maximum: 1, description: "True/False ratio in focus questions" })
  @IsNumber()
  @Min(0)
  @Max(1)
  f_tf_ratio: number;

  @ApiProperty({ example: 0.2, minimum: 0, maximum: 1, description: "Written ratio in focus questions" })
  @IsNumber()
  @Min(0)
  @Max(1)
  f_written_ratio: number;

  @ApiProperty({ example: 0.6, minimum: 0, maximum: 1, description: "MCQ ratio in remain questions" })
  @IsNumber()
  @Min(0)
  @Max(1)
  r_mcq_ratio: number;

  @ApiProperty({ example: 0.2, minimum: 0, maximum: 1, description: "True/False ratio in remain questions" })
  @IsNumber()
  @Min(0)
  @Max(1)
  r_tf_ratio: number;

  @ApiProperty({ example: 0.2, minimum: 0, maximum: 1, description: "Written ratio in remain questions" })
  @IsNumber()
  @Min(0)
  @Max(1)
  r_written_ratio: number;
}
