import { ApiProperty } from '@nestjs/swagger';

export class QuestionResponseDto {
    @ApiProperty({ description: 'Question ID' })
    id: number;

    @ApiProperty({ description: 'Question text' })
    question: string;

    @ApiProperty({ description: 'Question type' })
    type: string;

    @ApiProperty({ description: 'Question options' })
    options: string[];

    @ApiProperty({ description: 'Correct answer' })
    answer: string;

    @ApiProperty({ description: 'Question score' })
    score: number;

    @ApiProperty({ description: 'Creator ID' })
    createdById: number;

    @ApiProperty({ description: 'Quiz ID' })
    quizId: number;

    @ApiProperty({ description: 'Question mode' })
    mode: string;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;
}

export class QuestionListResponseDto {
    @ApiProperty({ description: 'List of questions', type: [QuestionResponseDto] })
    questions: QuestionResponseDto[];
}

export class QuestionCreateResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;

    @ApiProperty({ description: 'Added questions', type: [QuestionResponseDto] })
    addedQuestions: QuestionResponseDto[];
}

export class QuestionUpdateResponseDto extends QuestionResponseDto { }

export class QuestionDuplicateResponseDto extends QuestionResponseDto { }

export class QuestionDeleteResponseDto extends QuestionResponseDto { }

export class QuestionRemoveFromQuizResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;
}

export class AIQuestionsResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;

    @ApiProperty({ description: 'Number of questions added' })
    addedQuestions: number;

    @ApiProperty({ description: 'Total focus questions' })
    totalFocusQuestions: number;

    @ApiProperty({ description: 'Total remain questions' })
    totalRemainQuestions: number;
}
