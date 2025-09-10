import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateQuizDto {
  @ApiPropertyOptional({ example: "Final Exam", description: "Updated quiz title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 2, description: "Updated subject ID" })
  @IsOptional()
  @IsNumber()
  subjectId?: number;

  @ApiPropertyOptional({ example: 3, description: "Updated group ID" })
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @ApiPropertyOptional({ example: "2025-09-20T09:00:00Z", description: "Updated start date/time" })
  @IsOptional()
  @IsDateString()
  startsAt?: Date;

  @ApiPropertyOptional({ example: "2025-09-20T11:00:00Z", description: "Updated end date/time" })
  @IsOptional()
  @IsDateString()
  endsAt?: Date;

  @ApiPropertyOptional({ example: true, description: "Whether the quiz is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, description: "Whether students can change their answers" })
  @IsOptional()
  @IsBoolean()
  canChangeAnswer?: boolean;
}
