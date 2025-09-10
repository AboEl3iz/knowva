import { Injectable, InternalServerErrorException, BadRequestException, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { GenerateAIQuestionsDto } from './dto/generate-ai-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { validate } from 'class-validator';
import axios from 'axios';
import { StudentFeedbackDto } from './dto/student-feedback.dto';
import { QuestionAnswerDto } from './dto/question-answer.dto';
import { QuestionMode, QuestionType, NotificationType } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
@Injectable()
export class QuizService {
    constructor(private prisma: PrismaService, private notifications: NotificationService,
        private readonly notificationGateway: NotificationGateway,
        // private readonly http: HttpService,
    ) { }

    async getQuizes(userId: number) {
        let quizzes = await this.prisma.quiz.findMany({ where: { createdById: userId } });
        return quizzes.map(
            (q) => {
                let currentStatus: "UPCOMING" | "ONGOING" | "ENDED";
                if (new Date(q.startsAt) > new Date()) {
                    currentStatus = "UPCOMING";
                } else if (new Date(q.endsAt) > new Date()) {
                    currentStatus = "ONGOING";
                } else {
                    currentStatus = "ENDED";
                }
                return {
                    ...q,
                    currentStatus
                }
            }
        );
    }

    async getQuiz(id: number, userId: number) {
        let quiz = await (this.prisma as any).quiz.findUnique({
            where: { id, createdById: userId },
            include: { questions: { include: { question: true } } } as any
        });
        if (!quiz) throw new BadRequestException('Quiz not found');
        let currentStatus: "UPCOMING" | "ONGOING" | "ENDED";
        if (new Date(quiz.startsAt) > new Date()) {
            currentStatus = "UPCOMING";
        } else if (new Date(quiz.endsAt) > new Date()) {
            currentStatus = "ONGOING";
        } else {
            currentStatus = "ENDED";
        }
        return {
            ...quiz,
            currentStatus
        }

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
        return quiz.id;
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
        let quizzes = await this.prisma.quiz.findMany({ where: { createdById: userId, status: 'DRAFT' as any } });
        return quizzes.map(
            (q) => {
                let currentStatus: "UPCOMING" | "ONGOING" | "ENDED";
                if (new Date(q.startsAt) > new Date()) {
                    currentStatus = "UPCOMING";
                } else if (new Date(q.endsAt) > new Date()) {
                    currentStatus = "ONGOING";
                } else {
                    currentStatus = "ENDED";
                }
                return {
                    ...q,
                    currentStatus
                }
            }
        )
    }

    async getPublicQuizzes(userId: number) {
        let quizzes = await this.prisma.quiz.findMany({ where: { createdById: userId, status: 'PUBLIC' as any } });
        return quizzes.map(
            (q) => {
                let currentStatus: "UPCOMING" | "ONGOING" | "ENDED";
                if (new Date(q.startsAt) > new Date()) {
                    currentStatus = "UPCOMING";
                } else if (new Date(q.endsAt) > new Date()) {
                    currentStatus = "ONGOING";
                } else {
                    currentStatus = "ENDED";
                }
                return {
                    ...q,
                    currentStatus
                }
            }
        )
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
        return await this.prisma.question.findMany({ where: { createdById: userId } });
    }

    async getQuestion(id: number, userId: number) {
        return await this.prisma.question.findUnique({ where: { id, createdById: userId } });
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

    async addManualQuestionsToQuiz(userId: number, quizId: number, questionDtos: CreateQuestionDto[]) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        if (questionDtos.length === 0) throw new BadRequestException('No questions provided');

        // Perform validation checks for each questionDto
        // for (const questionDto of questionDtos) {
        //     const errors = await validate(questionDto);
        //     if (errors.length > 0) {
        //         console.log(errors);
        //         throw new BadRequestException('Invalid question data');
        //     }
        //     this.validateQuestionOptions(questionDto);
        // }

        // Use a transaction to create questions and their relations atomically
        return await this.prisma.$transaction(async (tx) => {
            // Step 1: Create the new question records
            const newQuestions = await Promise.all(
                questionDtos.map(dto =>
                    tx.question.create({
                        data: {
                            quizId: quiz.id,
                            ...dto,
                            createdById: userId,
                            mode: QuestionMode.MANUAL,
                        },
                    }),
                ),
            );

            // Step 2: Create the join records in the QuizQuestion table
            const quizQuestionsData = newQuestions.map((question) => ({
                quizId: quiz.id,
                questionId: question.id,
            }));

            await tx.quizQuestion.createMany({
                data: quizQuestionsData,
            });

            return {
                message: `Successfully added ${newQuestions.length} questions to the quiz.`,
                addedQuestions: newQuestions,
            };
        });
    }

    async addAiQuestionsToQuiz(userId: number, quizId: number, generateAIQuestionsDto: GenerateAIQuestionsDto) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });

        if (!quiz) {
            throw new BadRequestException('Quiz not found');
        }

        let response;
        try {
            response = await axios.post(
                "https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/generate_quiz/",
                {
                    language: quiz.language,
                    level: generateAIQuestionsDto.difficulty,
                    pdf_path: generateAIQuestionsDto.filePath,
                    n_questions: generateAIQuestionsDto.noOfFocusQuestions + (generateAIQuestionsDto.noOfRemainQuestions ?? 0),
                    f_mcq_ratio: generateAIQuestionsDto.mcqFocusRatio! / 100,
                    f_tf_ratio: generateAIQuestionsDto.tfFocusRatio! / 100,
                    f_written_ratio: generateAIQuestionsDto.writtenFocusRatio! / 100,
                    r_mcq_ratio: generateAIQuestionsDto.mcqRemainRatio ? generateAIQuestionsDto.mcqRemainRatio / 100 : null,
                    r_tf_ratio: generateAIQuestionsDto.tfRemainRatio ? generateAIQuestionsDto.tfRemainRatio / 100 : null,
                    r_written_ratio: generateAIQuestionsDto.writtenRemainRatio ? generateAIQuestionsDto.writtenRemainRatio / 100 : null,
                }

            );
        } catch (error) {
            throw new ForbiddenException('Failed to generate AI questions: ' + (error?.response?.data?.message || error.message));
        }
        Logger.debug(response.data);

        const dtos = response.data;

        for (const questionDto of dtos) {
            // const errors = await validate(CreateQuestionDto, questionDto);
            // if (errors.length > 0) {
            //     throw new BadRequestException('Invalid question data');
            // }
            this.validateQuestionOptions(questionDto);
        }

        //put score for every type
        for (const questionDto of dtos) {
            if (questionDto.type === QuestionType.MCQ) {
                questionDto.score = 1;
            } else if (questionDto.type === QuestionType.TrueFalse) {
                questionDto.score = 2;
            } else if (questionDto.type === QuestionType.Written) {
                questionDto.score = 3;
            }
        }


        let result = await this.prisma.question.createMany({

            data: dtos.map((questionDto) => (

                {
                    ...questionDto,
                    createdById: userId,
                    quizId,

                    mode: QuestionMode.AI
                }))
        });

        return {
            message: `Successfully added ${result.count} questions to the quiz.`,
            addedQuestions: result.count,
        };
    }

    async correctQuiz(userId: number, quizId: number) {
        const attempt = await this.prisma.quizAttempt.findFirst({
            where: {
                quizId,
                studentId: userId,
            },
            include: {
                quiz: {
                    include: {
                        questions: {
                            include: {
                                question: true
                            }
                        }, // الأسئلة الخاصة بالـ Quiz
                    },
                },
                studentAnswers: {
                    include: {
                        question: true, // عشان تجيب السؤال مع الإجابة
                    },
                },
            },
        });

        if (!attempt) {
            throw new NotFoundException('No attempt found for this student and quiz');
        }

        // نجهز الـ payload
        const payload = {
            max_grade: attempt.quiz.questions.reduce((sum, question) => sum + question.question.score, 0),
            questions: attempt.studentAnswers.map((ans) => ({
                question_id: ans.questionId.toString(),
                student_id: attempt.studentId.toString(),
                group_id: attempt.quiz.groupId.toString(),
                exam_id: attempt.quizId.toString(),
                question_text: ans.question.question,
                correct_answer: ans.question.answer,
                student_answer: ans.answer,
                score: ans.score,
            })),
        };

        let response;
        try {
            response = await axios.post(
                "https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/correct_quiz/",
                payload,
            );
        } catch (error) {
            throw new ForbiddenException(
                'Failed to correct quiz: ' + (error?.response?.data?.message || error.message),
            );
        }

        return {
            message: `Successfully corrected quiz ${quizId}.`,
            aiResult: response.data,
        };
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

    // async generateAiQuestions(quizId: number, teacherId: number , generateQuizByAi: GenerateQuizDto) {
    //     // request body for AI
    //     const requestBody = {
    //         // language: 'en',
    //         // level: 'hard',
    //         // pdf_path: 'data/The Machine Learning Pipeline.pdf',
    //         // n_questions: 10,
    //         // f_mcq_ratio: 0.6,
    //         // f_tf_ratio: 0.2,
    //         // f_written_ratio: 0.2,
    //         // r_mcq_ratio: 0.6,
    //         // r_tf_ratio: 0.2,
    //         // r_written_ratio: 0.2,
    //         ...generateQuizByAi
    //     };

    //     // 1. Call AI
    //     const { data } = await axios.post(
    //         'https://8000-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/generate_quiz/',
    //         requestBody,
    //     );

    //     if (!Array.isArray(data)) {
    //         throw new BadRequestException('AI did not return a valid list of questions');
    //     }

    //     type QuestionDTO = {
    //         id: number;
    //         text: string;
    //         type: string;
    //         options: string[];
    //         answer: string;
    //         quizId: number;
    //     };

    //     let savedQuestions: QuestionDTO[] = [];

    //     // 2. Validate & Save
    //     for (const q of data) {
    //         if (!q.question || typeof q.question !== 'string') continue;
    //         if (!q.type || !['MCQ', 'TrueFalse', 'Written'].includes(q.type)) continue;
    //         if (!q.answer || typeof q.answer !== 'string') continue;

    //         // if (q.type === 'MCQ') {
    //         //     if (!Array.isArray(q.options) || q.options.length < 2) continue;
    //         //     if (!q.options.includes(q.answer)) continue;
    //         // }

    //         // if (q.type === 'TrueFalse') {
    //         //     if (!['True', 'False'].includes(q.answer)) continue;
    //         // }

    //         // set default score if not present
    //         const score = typeof q.score === 'number' && q.score > 0 ? q.score : 1;

    //         // 3. Save question
    //         const savedQuestion = await this.prisma.question.create({
    //             data: {
    //                 question: q.question,
    //                 type: q.type as QuestionType,
    //                 options: q.options ?? [],
    //                 answer: q.answer,
    //                 score,
    //                 mode: QuestionMode.AI,
    //                 createdById: teacherId,
    //             },
    //         });

    //         // 4. Link with quiz
    //         await this.prisma.quizQuestion.create({
    //             data: {
    //                 quizId,
    //                 questionId: savedQuestion.id,
    //             },
    //         });

    //         savedQuestions.push({
    //             id: savedQuestion.id,
    //             text: savedQuestion.question,
    //             type: savedQuestion.type,
    //             options: savedQuestion.options,
    //             answer: savedQuestion.answer,
    //             quizId,
    //         });
    //     }

    //     return {
    //         message: `Saved ${savedQuestions.length} valid questions`,
    //         questions: savedQuestions,
    //     };
    // }


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

    async removeQuestionFromQuiz(userId: number, questionId: number, quizId: number) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');
        const question = await this.prisma.question.findUnique({ where: { id: questionId, createdById: userId } });
        if (!question) throw new BadRequestException('Question not found');
        const link = await this.prisma.quizQuestion.findFirst({ where: { quizId, questionId } });
        if (!link) throw new BadRequestException('Question is not linked to this quiz');
        await this.prisma.quizQuestion.delete({ where: { id: link.id } });
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
        const attempt = await this.prisma.quizAttempt.create({ data: { quizId, studentId: userId, startedAt: new Date() } });
        await this.notifications.create(quiz.createdById, `Student ${userId} started quiz: ${quiz.title}`, NotificationType.QUIZ_ASSIGNED);
        this.notificationGateway.sendNotification(quiz.createdById.toString(), `Student ${userId} started quiz: ${quiz.title}`);
        return attempt;
    }

    async addQuestionsAnswer(quizAttemptId: number, questionAnswerDtos: QuestionAnswerDto[]) {
        const attempt = await this.prisma.quizAttempt.findUnique({
            where: { id: quizAttemptId },
            include: { quiz: true },
        });
        if (!attempt) throw new BadRequestException('Attempt not found');


        // check if student already answered
        for (const questionAnswerDto of questionAnswerDtos) {
            const errors = await validate(questionAnswerDto);
            if (errors.length > 0) {
                throw new InternalServerErrorException('Invalid question answer data');
            }
            const question = await this.prisma.question.findUnique({ where: { id: questionAnswerDto.questionId } });
            if (!question) throw new BadRequestException('Question not found');
        }
        return await this.prisma.questionAnswer.createMany({ data: questionAnswerDtos.map((questionAnswerDto) => ({ ...questionAnswerDto, quizAttemptId })) });
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
