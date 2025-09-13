import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsNumber, Length, IsIn } from "class-validator";
import { IsDateStringFlexible } from "./validators/is-date-string-flexible.decorator";

export class CreateQuizDto {
  @ApiProperty({ example: "Midterm Exam", description: "Title of the quiz" })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 1, description: "ID of the subject associated with this quiz" })
  @IsNotEmpty()
  @IsNumber()
  subjectId: number;

  @ApiProperty({ example: 2, description: "ID of the group taking this quiz" })
  @IsNotEmpty()
  @IsNumber()
  groupId: number;

  @ApiProperty({ example: "en", enum: ["en", "ar"], description: "Language of the quiz" })
  @IsNotEmpty()
  @IsString()
  @Length(2)
  @IsIn(["en", "ar"])
  language: "en" | "ar";

  @ApiProperty({ example: "2025-09-15T09:00:00Z", description: "Start date/time of the quiz (ISO8601 format)" })
  @IsNotEmpty()
  @IsDateStringFlexible()
  startsAt: string;

  @ApiProperty({ example: "2025-09-15T10:30:00Z", description: "End date/time of the quiz (ISO8601 format)" })
  @IsNotEmpty()
  @IsDateStringFlexible()
  endsAt: string;

  @ApiProperty({ example: 90, description: "Duration of the quiz in minutes" })
  @IsNotEmpty()
  @IsNumber()
  durationMins: number;
}
