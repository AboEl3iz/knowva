import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionMode, QuestionType, NotificationType } from '@prisma/client';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { validate } from 'class-validator';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Injectable()
export class QuizService {
    constructor(private prisma: PrismaService, private notifications: NotificationService,
        private readonly notificationGateway: NotificationGateway
    ) { }

    async getQuizes(userId: number) {
        return this.prisma.quiz.findMany({ where: { createdById: userId } });
    }

    async getQuiz(id: number, userId: number) {
        let quiz = await (this.prisma as any).quiz.findUnique({
            where: { id, createdById: userId },
            include: { questions: { include: { question: true } } } as any
        });
        if (!quiz) throw new BadRequestException('Quiz not found');
        return quiz;
    }

    async createQuiz(userId: number, createQuizDto: CreateQuizDto) {
        if (new Date(createQuizDto.endsAt) <= new Date(createQuizDto.startsAt)) {
            throw new BadRequestException('endsAt must be after startsAt');
        }
        let subject = await this.prisma.subject.findUnique({ where: { id: createQuizDto.subjectId } });
        if (!subject) throw new BadRequestException('Subject not found');
        let group = await this.prisma.group.findUnique({ where: { id: createQuizDto.groupId } });
        if (!group) throw new BadRequestException('Group not found');
        const isActive = new Date(createQuizDto.startsAt) <= new Date();
        const quiz = await this.prisma.quiz.create({ data: { ...createQuizDto, createdById: userId, isActive, status: 'DRAFT' as any } });
        // Do NOT notify students on draft creation
        return quiz;
    }

    async updateQuiz(id: number, userId: number, updateQuizDto: UpdateQuizDto) {
        // validate quiz ownership
        const existing = await this.prisma.quiz.findUnique({ where: { id, createdById: userId } });
        if (!existing) throw new BadRequestException('Quiz not found');
        // recalc isActive if startsAt updated
        let data: any = { ...updateQuizDto };
        if (updateQuizDto.startsAt) {
            data.isActive = new Date(updateQuizDto.startsAt) <= new Date();
        }
        const quiz = await this.prisma.quiz.update({ where: { id }, data });
        return quiz;
    }

    async updateQuizStatus(id: number, userId: number, status: 'DRAFT' | 'PUBLIC') {
        const quiz = await this.prisma.quiz.findUnique({ where: { id, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        const updated = await this.prisma.quiz.update({ where: { id }, data: { status: status as any } });
        // If publishing now, notify approved group members
        if (quiz.status !== 'PUBLIC' && status === 'PUBLIC') {
            const members = await this.prisma.membership.findMany({ where: { groupId: updated.groupId, status: 'APPROVED' }, select: { studentId: true } });
            for (const m of members) {
                await this.notifications.create(m.studentId, `New quiz: ${updated.title} starts at ${updated.startsAt.toISOString()}`, NotificationType.QUIZ_ASSIGNED);
                this.notificationGateway.sendNotification(m.studentId.toString(), `New quiz: ${updated.title} starts at ${updated.startsAt.toISOString()}`);
            }
        }
        return updated;
    }

    async getDraftQuizzes(userId: number) {
        return this.prisma.quiz.findMany({ where: { createdById: userId, status: 'DRAFT' as any } });
    }

    async getPublicQuizzes(userId: number) {
        return this.prisma.quiz.findMany({ where: { createdById: userId, status: 'PUBLIC' as any } });
    }

    async duplicateQuiz(id: number, userId: number) {
        const quiz = await (this.prisma as any).quiz.findUnique({
            where: {
                id,
                createdById: userId
            },
            include: { questions: { select: { questionId: true } } as any }
        });

        if (!quiz) {
            throw new InternalServerErrorException('Quiz not found');
        }

        const newQuiz = await (this.prisma as any).quiz.create({
            data: {
                title: `${quiz.title} Copy`,
                status: quiz.status as any,
                subjectId: quiz.subjectId,
                groupId: quiz.groupId,
                createdById: userId,
                startsAt: quiz.startsAt,
                endsAt: quiz.endsAt,
                isActive: quiz.isActive,
                canChangeAnswer: quiz.canChangeAnswer,
                questions: { create: (quiz.questions || []).map((qq: any) => ({ questionId: qq.questionId })) as any }
            }
        });
        return newQuiz;
    }

    async getQuestions(userId: number) {
        return this.prisma.question.findMany({ where: { createdById: userId } });
    }

    async getQuestion(id: number, userId: number) {
        return this.prisma.question.findUnique({ where: { id, createdById: userId } });
    }

    async addOldQuestionToQuiz(userId: number, quizId: number, questionId: number) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        const question = await this.prisma.question.findUnique({ where: { id: questionId, createdById: userId } });
        if (!question) throw new BadRequestException('Question not found');
        const existing = await (this.prisma as any).quizQuestion.findFirst({ where: { quizId, questionId } });
        if (existing) return existing as any;
        return await (this.prisma as any).quizQuestion.create({ data: { quizId, questionId } });
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

    async addManualQuestionToQuiz(userId: number, quizId: number, questionDto: CreateQuestionDto) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        this.validateQuestionOptions(questionDto);
        const created = await (this.prisma as any).question.create({ data: { ...questionDto, createdById: userId, mode: QuestionMode.MANUAL } as any });
        await (this.prisma as any).quizQuestion.create({ data: { quizId, questionId: created.id } });
        return created;
    }

    async addAiQuestionsToQuiz(userId: number, quizId: number, noOfQuestions: number) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        // TODO: fetch questions from proccess.env.KNOWVA_AI_API using axios asking for <noOfQuestions> Ai generated questions
        // and the response should be { questions: CreateQuestionDto[] }
        // validate each dto and its options then add them to the database
        const questionDtos: CreateQuestionDto[] = [];

        for (const questionDto of questionDtos) {
            const errors = await validate(questionDto);
            if (errors.length > 0) {
                throw new InternalServerErrorException('Invalid question data');
            }

            this.validateQuestionOptions(questionDto);
            const created = await (this.prisma as any).question.create({ data: { ...questionDto, createdById: userId, mode: QuestionMode.AI } as any });
            await (this.prisma as any).quizQuestion.create({ data: { quizId, questionId: created.id } });
        }
        return { count: questionDtos.length };
    }

    async saveAiQuestions(userId: number, quizId: number, questions: CreateQuestionDto[]) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        for (const q of questions) {
            this.validateQuestionOptions(q);
            const created = await (this.prisma as any).question.create({ data: { ...q, createdById: userId, mode: QuestionMode.AI } as any });
            await (this.prisma as any).quizQuestion.create({ data: { quizId, questionId: created.id } });
        }
        return { count: questions.length };
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

        return this.prisma.question.update({ where: { id: questionId, createdById: userId }, data: questionDto });
    }

    async removeQuestionFromQuiz(userId: number, questionId: number, quizId: number) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        const question = await this.prisma.question.findUnique({ where: { id: questionId, createdById: userId } });
        if (!question) throw new BadRequestException('Question not found');
        const link = await (this.prisma as any).quizQuestion.findFirst({ where: { quizId, questionId } });
        if (!link) throw new BadRequestException('Question is not linked to this quiz');
        await (this.prisma as any).quizQuestion.delete({ where: { id: link.id } });
        return { message: 'Question removed successfully' };
    }

    async deleteQuestion(userId: number, questionId: number) {
        const question = await this.prisma.question.findUnique({ where: { id: questionId, createdById: userId } });
        if (!question) throw new BadRequestException('Question not found');
        const links = await (this.prisma as any).quizQuestion.count({ where: { questionId } });
        if (links > 0) throw new BadRequestException('Question is linked to quizzes; remove links first');
        return (this.prisma as any).question.delete({ where: { id: questionId, createdById: userId } });
    }

    async getMyQuizAttempts(userId: number, quizId: number) {
        return await this.prisma.quizAttempt.findMany({ where: { studentId: userId, quizId } });
    }

    async getQuizAttempts(quizId: number, userId: number) {
        let quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        return await this.prisma.quiz.findMany({ where: { id: quizId, createdById: userId }, select: { attempts: true } });
    }

    async startQuizAttempt(userId: number, quizId: number) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        if (quiz.status !== 'PUBLIC') {
            throw new BadRequestException('Quiz is not published');
        }
        if (quiz.startsAt > new Date() || quiz.endsAt <= new Date()) {
            throw new BadRequestException('Quiz is not available');
        }
        const attempt = await this.prisma.quizAttempt.create({ data: { quizId, studentId: userId } });
        await this.notifications.create(quiz.createdById, `Student ${userId} started quiz: ${quiz.title}`, NotificationType.QUIZ_ASSIGNED);
        this.notificationGateway.sendNotification(quiz.createdById.toString(), `Student ${userId} started quiz: ${quiz.title}`);
        return attempt;
    }

    async addQuestionAnswer(quizAttemptId: number, questionId: number, answer: string) {
        const attempt = await this.prisma.quizAttempt.findUnique({
            where: { id: quizAttemptId },
            include: { quiz: true },
        });
        if (!attempt) throw new BadRequestException('Attempt not found');

        const question = await this.prisma.question.findUnique({ where: { id: questionId } });
        if (!question) throw new BadRequestException('Question not found');

        // check if student already answered
        let studentAnswer = await this.prisma.studentAnswer.findUnique({
            where: {
                quizAttemptId_questionId: { quizAttemptId, questionId },
            },
        });

        if (studentAnswer) {
            // If answer exists
            if (attempt.quiz.canChangeAnswer) {
                studentAnswer = await this.prisma.studentAnswer.update({
                    where: { id: studentAnswer.id },
                    data: { answer },
                });
            } else {
                throw new BadRequestException('Answer cannot be changed');
            }
        } else {
            // If no answer yet → create new one
            studentAnswer = await this.prisma.studentAnswer.create({
                data: { quizAttemptId, questionId, answer },
            });
        }

        return studentAnswer;
    }


    async updateQuestionAnswer(quizAttemptId: number, questionId: number, answer: string) {
        return this.prisma.studentAnswer.update({
            where: {
                quizAttemptId_questionId: {
                    quizAttemptId,
                    questionId,
                },
                quizAttempt: {
                    quiz: {
                        canChangeAnswer: true,
                        endsAt: { gt: new Date() }
                    }
                }
            },
            data: { answer }
        });
    }

    async finishQuizAttempt(userId: number, quizAttemptId: number) {
        const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: quizAttemptId }, include: { quiz: true, studentAnswers: { include: { question: true } } } });
        if (!attempt || attempt.studentId !== userId) throw new BadRequestException('Attempt not found');
        let score = 0;
        let total = 0;
        for (const ans of attempt.studentAnswers as any[]) {
            total += ans.question.score;
            if (ans.question.type === 'Written') continue;
            if (ans.answer === ans.question.answer) score += ans.question.score;
        }
        await this.prisma.quizAttempt.update({ where: { id: quizAttemptId }, data: { score } });
        await this.notifications.create(userId, `Your results for quiz "${attempt.quiz.title}": ${score}/${total}`, NotificationType.QUIZ_COMPLETED);
        this.notificationGateway.sendNotification(userId.toString(), `Your results for quiz "${attempt.quiz.title}": ${score}/${total}`);
        return { score, total };
    }
}
