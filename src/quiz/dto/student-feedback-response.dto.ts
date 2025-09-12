import { ApiProperty } from "@nestjs/swagger";

export class QuestionFeedbackResponseDto {
  @ApiProperty({ description: "Feedback ID" })
  id: number;

  @ApiProperty({ description: "Feedback text for the question" })
  feedback: string;

  @ApiProperty({ description: "Student's answer to the question" })
  studentAnswer: {
    id: number;
    answer: string;
    score: number;
    question: {
      id: number;
      question: string;
      answer: string;
      type: string;
      options: string[];
      score: number;
    };
  };
}

export class AttemptFeedbackResponseDto {
  @ApiProperty({ description: "Feedback ID" })
  id: number;

  @ApiProperty({ description: "Overall summary of the quiz attempt" })
  summary: string;

  @ApiProperty({ description: "List of weak points identified" })
  weakPoints: string[];

  @ApiProperty({ description: "List of good points identified" })
  goodPoints: string[];

  @ApiProperty({ description: "Question-level feedback", type: [QuestionFeedbackResponseDto] })
  QuestionFeedback: QuestionFeedbackResponseDto[];

  @ApiProperty({ description: "When the feedback was created" })
  createdAt: Date;
}

export class StudentFeedbackResponseDto {
  @ApiProperty({ description: "Quiz attempt ID" })
  id: number;

  @ApiProperty({ description: "Quiz attempt score" })
  score: number;

  @ApiProperty({ description: "When the attempt was created" })
  createdAt: Date;

  @ApiProperty({ description: "When the attempt was started" })
  startedAt: Date;

  @ApiProperty({ description: "When the attempt was ended" })
  endedAt: Date;

  @ApiProperty({ description: "Quiz information" })
  quiz: {
    id: number;
    title: string;
    subject: {
      title: string;
    };
  };

  @ApiProperty({ description: "Detailed feedback for the attempt", type: AttemptFeedbackResponseDto })
  feedback: AttemptFeedbackResponseDto;

  @ApiProperty({ description: "Student's answers to all questions" })
  studentAnswers: Array<{
    id: number;
    answer: string;
    score: number;
    question: {
      id: number;
      question: string;
      answer: string;
      type: string;
      options: string[];
      score: number;
    };
  }>;
}
