import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class StudentFeedbackDto {
  @ApiProperty({ example: 501, description: "ID of the student's answer" })
  @IsNotEmpty()
  @IsNumber()
  answerId: number;

  @ApiProperty({ example: "The explanation was unclear", description: "Feedback text from student" })
  @IsNotEmpty()
  @IsString()
  feedback: string;
}
