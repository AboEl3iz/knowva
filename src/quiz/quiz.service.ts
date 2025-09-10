import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { GenerateAIQuestionsDto } from './dto/generate-ai-questions.dto';
import { QuestionMode, QuestionType } from '@prisma/client';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { validate } from 'class-validator';
import axios from 'axios';
import { StudentFeedbackDto } from './dto/student-feedback.dto';
import { QuestionAnswerDto } from './dto/question-answer.dto';
@Injectable()
export class QuizService {
    constructor(private prisma: PrismaService) { }

    async getQuizes(userId: number) {
        return await this.prisma.quiz.findMany({ where: { createdById: userId } });
    }

    async getQuiz(id: number, userId: number) {
        return await this.prisma.quiz.findUnique({
            where: { id, createdById: userId },
            include: { questions: true }
        });
    }

    async createQuiz(userId: number, createQuizDto: CreateQuizDto) {
        return (await this.prisma.quiz.create({ data: { ...createQuizDto, createdById: userId } })).id;
    }

    async updateQuiz(id: number, userId: number, updateQuizDto: UpdateQuizDto) {
        return await this.prisma.quiz.update({ where: { id, createdById: userId }, data: updateQuizDto });
    }

    async duplicateQuiz(id: number, userId: number) {
        const quiz = await this.prisma.quiz.findUnique({
            where: {
                id,
                createdById: userId
            },
            include: {
                questions: {
                    select: { id: true }
                }
            }
        });

        if (!quiz) {
            throw new InternalServerErrorException('Quiz not found');
        }

        const newQuiz = await this.prisma.quiz.create({
            data: {
                ...quiz,
                title: `${quiz.title} Copy`,
                createdById: userId,
                questions: {
                    connect: quiz.questions.map((question) => ({ id: question.id }))
                }
            }
        });
        return newQuiz;
    }

    async getQuestions(userId: number) {
        return await this.prisma.question.findMany({ where: { createdById: userId } });
    }

    async getQuestion(id: number, userId: number) {
        return await this.prisma.question.findUnique({ where: { id, createdById: userId } });
    }

    async addOldQuestionToQuiz(userId: number, quizId: number, questionId: number) {
        const question = await this.prisma.question.findUnique({
            where: {
                id: questionId,
                createdById: userId
            }
        });

        if (!question) {
            throw new InternalServerErrorException('Question not found');
        }

        return await this.prisma.question.create({ data: { ...question, createdById: userId, quizId } });
    }

    private validateQuestionOptions(question: any) {
        if (question.type === QuestionType.TrueFalse) {
            if (question.answer !== 'True' && question.answer !== 'False')
                throw new InternalServerErrorException('Answer must be True or False');

            question.options = ['True', 'False'];
        }
        else if (question.type === QuestionType.Written) {
            question.options = [];
        }
    }

    async addManualQuestionsToQuiz(userId: number, quizId: number, questionDtos: CreateQuestionDto[]) {
        for (const questionDto of questionDtos) {
            const errors = await validate(questionDto);
            if (errors.length > 0) {
                throw new InternalServerErrorException('Invalid question data');
            }
            this.validateQuestionOptions(questionDto);
        }

        return await this.prisma.question.createMany({
            data: questionDtos.map((questionDto) => ({
                ...questionDto,
                createdById: userId,
                quizId,
                mode: QuestionMode.MANUAL
            }))
        });
    }

    async addAiQuestionsToQuiz(userId: number, quizId: number, generateAIQuestionsDto: GenerateAIQuestionsDto) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });

        if (!quiz) {
            throw new InternalServerErrorException('Quiz not found');
        }

        let response;
        try {
            response = await axios.post(
                "https://8000-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/generate_quiz",
                {
                    "language": quiz.language,
                    "level": generateAIQuestionsDto.difficulty,
                    "pdf_path": generateAIQuestionsDto.filePath,
                    "n_focus": generateAIQuestionsDto.noOfFocusQuestions,
                    "n_remain": generateAIQuestionsDto.noOfRemainQuestions,
                    "focus_pages": generateAIQuestionsDto.startingFocusPage > generateAIQuestionsDto.endingFocusPage ? [] : Array.from({ length: generateAIQuestionsDto.endingFocusPage - generateAIQuestionsDto.startingFocusPage + 1 }, (_, index) => index + generateAIQuestionsDto.startingFocusPage),
                    "remain_pages": generateAIQuestionsDto.noOfRemainQuestions ? generateAIQuestionsDto.startingRemainPage! > generateAIQuestionsDto.endingRemainPage! ? [] : Array.from({ length: generateAIQuestionsDto.endingRemainPage! - generateAIQuestionsDto.startingRemainPage! + 1 }, (_, index) => index + generateAIQuestionsDto.startingRemainPage!) : [],
                    "f_mcq_ratio": generateAIQuestionsDto.mcqFocusRatio,
                    "f_tf_ratio": generateAIQuestionsDto.tfFocusRatio,
                    "f_written_ratio": generateAIQuestionsDto.writtenFocusRatio,
                    "r_mcq_ratio": generateAIQuestionsDto.noOfRemainQuestions ? generateAIQuestionsDto.mcqRemainRatio : null,
                    "r_tf_ratio": generateAIQuestionsDto.noOfRemainQuestions ? generateAIQuestionsDto.tfRemainRatio : null,
                    "r_written_ratio": generateAIQuestionsDto.noOfRemainQuestions ? generateAIQuestionsDto.writtenRemainRatio : null
                });
        } catch (error) {
            throw new InternalServerErrorException('Failed to generate AI questions: ' + (error?.response?.data?.message || error.message));
        }

        const dtos = response.data.questions;

        for (const questionDto of dtos) {
            const errors = await validate(CreateQuestionDto, questionDto);
            if (errors.length > 0) {
                throw new InternalServerErrorException('Invalid question data');
            }
            this.validateQuestionOptions(questionDto);
        }

        await this.prisma.question.createMany({
            data: dtos.map((questionDto) => ({
                ...questionDto,
                createdById: userId,
                quizId,
                mode: QuestionMode.AI
            }))
        });
    }

    async duplicateQuestion(userId: number, questionId: number) {
        const question = await this.prisma.question.findUnique({
            where: {
                id: questionId,
                createdById: userId
            }
        });

        if (!question) {
            throw new InternalServerErrorException('Question not found');
        }

        const newQuestion = await this.prisma.question.create({ data: question });
        return newQuestion;
    }

    async updateQuestion(userId: number, questionId: number, questionDto: UpdateQuestionDto) {
        this.validateQuestionOptions(questionDto);

        return await this.prisma.question.update({ where: { id: questionId, createdById: userId }, data: questionDto });
    }

    async removeQuestionFromQuiz(userId: number, questionId: number) {
        return await this.prisma.question.update({
            where: { id: questionId, createdById: userId },
            data: { quizId: undefined }
        });
    }

    async deleteQuestion(userId: number, questionId: number) {
        return await this.prisma.question.delete({ where: { id: questionId, createdById: userId, quizId: undefined } });
    }

    async getMyQuizAttempts(userId: number, quizId: number) {
        return await this.prisma.quizAttempt.findMany({ where: { studentId: userId, quizId } });
    }

    async getQuizAttempts(quizId: number, userId: number) {
        return await this.prisma.quiz.findMany({ where: { id: quizId, createdById: userId }, select: { attempts: true } });
    }

    async startQuizAttempt(userId: number, quizId: number) {
        const attempt = await this.prisma.quiz.update({
            where: { id: quizId, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
            data: {
                attempts: { create: { studentId: userId } }
            }
        });
        return attempt.id;
    }

    async addQuestionsAnswer(quizAttemptId: number, questionAnswerDtos: QuestionAnswerDto[]) {
        for (const questionAnswerDto of questionAnswerDtos) {
            const errors = await validate(questionAnswerDto);
            if (errors.length > 0) {
                throw new InternalServerErrorException('Invalid question answer data');
            }
        }
        return await this.prisma.questionAnswer.createMany({ data: questionAnswerDtos.map((questionAnswerDto) => ({ ...questionAnswerDto, quizAttemptId })) });
    }

    async completeQuizAttempt(quizAttemptId: number, userId: number) {
        const attempt = await this.prisma.quizAttempt.findFirst({
            where: { id: quizAttemptId, studentId: userId },
            include: {
                studentAnswers: {
                    include: { question: true }
                }
            }
        });

        if (!attempt) {
            throw new InternalServerErrorException('Quiz attempt not found');
        }

        // Calculate total score
        const totalScore = attempt.studentAnswers.reduce((sum, answer) => sum + answer.score, 0);
        const maxScore = attempt.studentAnswers.reduce((sum, answer) => sum + answer.question.score, 0);

        return await this.prisma.quizAttempt.update({
            where: { id: quizAttemptId },
            data: { score: totalScore, endedAt: new Date() }
        });
    }

    async getQuizAttempt(quizAttemptId: number, userId: number) {
        return await this.prisma.quizAttempt.findFirst({
            where: { id: quizAttemptId, studentId: userId },
            include: {
                quiz: {
                    include: { questions: true }
                },
                studentAnswers: {
                    include: { question: true }
                }
            }
        });
    }

    async getAvailableQuizzes(userId: number) {
        return await this.prisma.quiz.findMany({
            where: {
                isActive: true,
                startsAt: { lte: new Date() },
                endsAt: { gt: new Date() },
                group: {
                    memberships: {
                        some: {
                            studentId: userId,
                            status: 'APPROVED'
                        }
                    }
                }
            },
            include: {
                group: true,
                subject: true
            }
        });
    }



    async requestFeedbackStudent(userId: number, quizId: number) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId, createdById: userId },
            include: {
                attempts: {
                    include: {
                        studentAnswers: {
                            include: { question: true }
                        }
                    }
                }
            }
        });
        if (!quiz) {
            throw new InternalServerErrorException('Quiz not found');
        }

        let response;
        try {
            response = await axios.post(
                "https://8000-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/feedback_student",
                quiz.attempts.map((attempt) => ({
                    "attempt_id": attempt.id,
                    "questions": attempt.studentAnswers.map((sa) => ({
                        "answer_id": sa.id,
                        "question": sa.question.question,
                        "student_answer": sa.answer,
                        "correct_answer": sa.question.answer,
                        "type": sa.question.type,
                        "options": sa.question.options,
                        "q_weight": sa.question.score,
                        "score": sa.score
                    }))
                }))
            );
        }
        catch (error) {
            throw new InternalServerErrorException(error.message);
        }

        const attempts = response.data;

        for (const attempt of attempts) {
            const dtos: StudentFeedbackDto[] = attempt.results.map((dto) => ({
                answerId: dto.answer_id,
                feedback: dto.feedback
            }))

            for (const dto of dtos) {
                const errors = await validate(dto);
                if (errors.length > 0) {
                    throw new InternalServerErrorException('Invalid question data');
                }
                this.validateQuestionOptions(dto);
            }
        }

        await this.prisma.questionFeedback.createMany({
            data: attempts.flatMap((attempt) => attempt.results.map((result) => ({
                answerId: result.answer_id,
                feedback: result.feedback
            })))
        });
    }

    async getRequestedFeedbackTeacher(userId: number, studentId: number) {
        return await this.prisma.studentFeedback.findMany({ where: { teacherId: userId, studentId } });
    }

    async requestFeedbackTeacher(userId: number, studentId: number) {
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: {
                quizAttempts: {
                    include: {
                        studentAnswers: {
                            include: { question: true }
                        },
                        feedback: true
                    }
                }
            }
        })

        if (!student) {
            throw new InternalServerErrorException('Student not found');
        }

        let response;
        try {
            response = await axios.post(
                "https://8000-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/feedback_teacher",
                {
                    "student_id": studentId,
                    "latest_score": student.quizAttempts[0].score,
                    "summary": student.quizAttempts[0].feedback?.summary,
                    "good_points": student.quizAttempts[0].feedback?.goodPoints,
                    "weak_points": student.quizAttempts[0].feedback?.weakPoints,
                    "history": student.quizAttempts.map((attempt) => ({
                        "student_id": studentId,
                        "score": attempt.score,
                        "strong_points": attempt.feedback?.goodPoints,
                        "weak_points": attempt.feedback?.weakPoints
                    }))
                }
            );
        } catch (error) {
            throw new InternalServerErrorException('Failed to generate teacher feedback: ' + (error?.response?.data?.message || error.message));
        }

        const data = response.data;

        return await this.prisma.studentFeedback.create({
            data: {
                studentId,
                teacherId: userId,
                progress: data.progress,
                summaryFeedback: data.summary_feedback,
                strongPoints: data.strong_points,
                weakPoints: data.weak_points,
                improvedPoints: data.improved_points,
                declinedPoints: data.declined_points,
                unchangedPoints: data.unchanged_points,
                scoreTrend: data.score_trend,
                riskLevel: data.risk_level,
                teachingRecommendation: data.teaching_recommendation
            }
        });
    }
}
