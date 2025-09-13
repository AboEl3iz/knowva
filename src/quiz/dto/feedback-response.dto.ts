import { ApiProperty } from '@nestjs/swagger';

export class FeedbackRequestResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;
}

export class TeacherFeedbackResponseDto {
    @ApiProperty({ description: 'Feedback ID' })
    id: number;

    @ApiProperty({ description: 'Student ID' })
    studentId: number;

    @ApiProperty({ description: 'Teacher ID' })
    teacherId: number;

    @ApiProperty({ description: 'Progress description' })
    progress: string;

    @ApiProperty({ description: 'Summary feedback' })
    summaryFeedback: string;

    @ApiProperty({ description: 'Strong points', type: [String] })
    strongPoints: string[];

    @ApiProperty({ description: 'Weak points', type: [String] })
    weakPoints: string[];

    @ApiProperty({ description: 'Improved points', type: [String] })
    improvedPoints: string[];

    @ApiProperty({ description: 'Declined points', type: [String] })
    declinedPoints: string[];

    @ApiProperty({ description: 'Unchanged points', type: [String] })
    unchangedPoints: string[];

    @ApiProperty({ description: 'Score trend', type: [Number] })
    scoreTrend: number[];

    @ApiProperty({ description: 'Risk level' })
    riskLevel: string;

    @ApiProperty({ description: 'Teaching recommendation' })
    teachingRecommendation: string;

    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;

    @ApiProperty({ description: 'User ID', nullable: true })
    userId: number | null;
}

export class TeacherFeedbackListResponseDto {
    @ApiProperty({ description: 'List of teacher feedback', type: [TeacherFeedbackResponseDto] })
    feedback: TeacherFeedbackResponseDto[];
}

export class GroupFeedbackResponseDto {
    @ApiProperty({ description: 'Group summary' })
    group_summary: string;

    @ApiProperty({ description: 'Average score' })
    average_score: number;

    @ApiProperty({ description: 'Average success rate' })
    average_success_rate: number;

    @ApiProperty({ description: 'Total students' })
    total_students: number;

    @ApiProperty({ description: 'Recommendations', type: [String] })
    recommendations: string[];

    @ApiProperty({ description: 'Individual insights' })
    individual_insights: Array<{
        student_id: string;
        performance_level: string;
        key_strengths: string[];
        areas_for_improvement: string[];
    }>;

    @ApiProperty({ description: 'Note about the response' })
    note?: string;
}

export class QuizCorrectionResponseDto {
    @ApiProperty({ description: 'Success message' })
    message: string;

    @ApiProperty({ description: 'AI correction result' })
    aiResult: any;
}
