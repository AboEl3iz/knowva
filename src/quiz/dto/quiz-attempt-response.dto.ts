import { ApiProperty } from '@nestjs/swagger';

export class QuizAttemptResponseDto {
    @ApiProperty({ description: 'Quiz attempt ID' })
    id: number;

    @ApiProperty({ description: 'Quiz ID' })
    quizId: number;

    @ApiProperty({ description: 'Student ID' })
    studentId: number;

    @ApiProperty({ description: 'Attempt score' })
    score: number;

    @ApiProperty({ description: 'When the attempt was started' })
    startedAt: Date;

    @ApiProperty({ description: 'When the attempt was ended' })
    endedAt: Date;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;
}

export class QuizAttemptWithDetailsResponseDto extends QuizAttemptResponseDto {
    @ApiProperty({ description: 'Quiz information' })
    quiz: {
        id: number;
        title: string;
        subjectId: number;
        groupId: number;
        language: string;
        startsAt: Date;
        endsAt: Date;
        durationMins: number;
        isActive: boolean;
        status: string;
        canChangeAnswer: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
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
    };

    @ApiProperty({ description: 'Student answers' })
    studentAnswers: Array<{
        id: number;
        answer: string;
        score: number;
        questionId: number;
        quizAttemptId: number;
        createdAt: Date;
        updatedAt: Date;
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

export class QuizAttemptListResponseDto {
    @ApiProperty({ description: 'List of quiz attempts', type: [QuizAttemptResponseDto] })
    attempts: QuizAttemptResponseDto[];
}

export class QuizAttemptStartResponseDto extends QuizAttemptResponseDto { }

export class QuizAttemptCompleteResponseDto {
    @ApiProperty({ description: 'Quiz attempt ID' })
    attemptId: number;

    @ApiProperty({ description: 'Total score achieved' })
    totalScore: number;

    @ApiProperty({ description: 'Total possible score' })
    totalPossibleScore: number;

    @ApiProperty({ description: 'Score percentage' })
    scorePercentage: number;

    @ApiProperty({ description: 'Question results' })
    results: Array<{
        questionId: number;
        questionText: string;
        correctAnswer: string;
        studentAnswer: string;
        maxScore: number;
        studentScore: number;
    }>;
}

export class AvailableQuizResponseDto {
    @ApiProperty({ description: 'Quiz ID' })
    id: number;

    @ApiProperty({ description: 'Quiz title' })
    title: string;

    @ApiProperty({ description: 'Subject ID' })
    subjectId: number;

    @ApiProperty({ description: 'Group ID' })
    groupId: number;

    @ApiProperty({ description: 'Language' })
    language: string;

    @ApiProperty({ description: 'Start date/time' })
    startsAt: Date;

    @ApiProperty({ description: 'End date/time' })
    endsAt: Date;

    @ApiProperty({ description: 'Duration in minutes' })
    durationMins: number;

    @ApiProperty({ description: 'Whether active' })
    isActive: boolean;

    @ApiProperty({ description: 'Quiz status' })
    status: string;

    @ApiProperty({ description: 'Can change answer' })
    canChangeAnswer: boolean;

    @ApiProperty({ description: 'Creator ID' })
    createdById: number;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;

    @ApiProperty({ description: 'Group information' })
    group: {
        id: number;
        name: string;
        description: string;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    };

    @ApiProperty({ description: 'Subject information' })
    subject: {
        id: number;
        title: string;
        description: string;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    };
}

export class AvailableQuizListResponseDto {
    @ApiProperty({ description: 'List of available quizzes', type: [AvailableQuizResponseDto] })
    quizzes: AvailableQuizResponseDto[];
}
