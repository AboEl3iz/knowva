import { ApiProperty } from "@nestjs/swagger";

export class IndividualFeedbackDto {
  @ApiProperty({ description: "Student ID" })
  student_id: string;

  @ApiProperty({ description: "Summary of student performance" })
  summary: string;

  @ApiProperty({ description: "List of student strengths", type: [String] })
  strengths: string[];

  @ApiProperty({ description: "List of student weaknesses", type: [String] })
  weaknesses: string[];
}

export class GroupFeedbackRequestDto {
  @ApiProperty({ description: "List of most commonly wrong questions", type: [String] })
  most_wrong_questions: string[];

  @ApiProperty({ description: "Average score for this quiz" })
  avg_score_this_quiz: number;

  @ApiProperty({ description: "Previous quiz scores", type: [Number] })
  avg_score_prev: number[];

  @ApiProperty({ description: "Success rate for this quiz" })
  success_rate_this_quiz: number;

  @ApiProperty({ description: "Previous quiz success rates", type: [Number] })
  success_rate_prev: number[];

  @ApiProperty({ description: "Individual feedback for each student", type: [IndividualFeedbackDto] })
  individual_feedback: IndividualFeedbackDto[];
}
