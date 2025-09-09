import { IsString, IsNumber, IsArray, IsOptional, IsIn, Min, Max } from 'class-validator';

export class GenerateQuizDto {
  @IsString()
  language: string;

  @IsString()
  level: string;

  @IsString()
  pdf_path: string;

  @IsNumber()
  n_questions: number;

  @IsNumber()
  n_focus: number;

  @IsNumber()
  n_remain: number;

  @IsArray()
  @IsNumber({}, { each: true })
  focus_pages: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  remain_pages: number[];

  @IsNumber()
  @Min(0)
  @Max(1)
  f_mcq_ratio: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  f_tf_ratio: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  f_written_ratio: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  r_mcq_ratio: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  r_tf_ratio: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  r_written_ratio: number;
}
