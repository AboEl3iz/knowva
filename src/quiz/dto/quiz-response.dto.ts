import { ApiProperty } from '@nestjs/swagger';

export class QuizResponseDto {
    @ApiProperty({ description: 'Quiz ID' })
    id: number;

    @ApiProperty({ description: 'Quiz title' })
    title: string;

    @ApiProperty({ description: 'Subject ID' })
    subjectId: number;

    @ApiProperty({ description: 'Group ID' })
    groupId: number;

    @ApiProperty({ description: 'Language of the quiz' })
    language: string;

    @ApiProperty({ description: 'Start date/time of the quiz' })
    startsAt: Date;

    @ApiProperty({ description: 'End date/time of the quiz' })
    endsAt: Date;

    @ApiProperty({ description: 'Duration in minutes' })
    durationMins: number;

    @ApiProperty({ description: 'Whether the quiz is active' })
    isActive: boolean;

    @ApiProperty({ description: 'Quiz status' })
    status: string;

    @ApiProperty({ description: 'Whether students can change answers' })
    canChangeAnswer: boolean;

    @ApiProperty({ description: 'Creator ID' })
    createdById: number;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;

    @ApiProperty({ description: 'Current status based on time' })
    currentStatus: 'UPCOMING' | 'ONGOING' | 'ENDED';
}

export class QuizWithQuestionsResponseDto extends QuizResponseDto {
    @ApiProperty({ description: 'Questions in the quiz' })
    questions: Array<{
        id: number;
        questionId: number;
        question: {
            id: number;
            question: string;
            type: string;
            options: string[];
            answer: string;
            score: number;
            createdById: number;
            quizId: number;
            mode: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}

export class QuizListResponseDto {
    @ApiProperty({ description: 'List of quizzes', type: [QuizResponseDto] })
    quizzes: QuizResponseDto[];
}

export class QuizCreateResponseDto {
    @ApiProperty({ description: 'Created quiz ID' })
    id: number;
}

export class QuizUpdateResponseDto extends QuizResponseDto { }

export class QuizDuplicateResponseDto extends QuizResponseDto { }

export class QuizDeleteResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;
}

export class QuizStatusUpdateResponseDto extends QuizResponseDto { }
