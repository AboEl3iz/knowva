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
import { GroupFeedbackRequestDto } from './dto/group-feedback-request.dto';
import { QuestionMode, QuestionType, NotificationType } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { WrittenQuestionPayload } from 'src/helper/interfaces/interfaces.response';
import { TimezoneService } from 'src/common/timezone.service';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class QuizService {
    constructor(
        private prisma: PrismaService, 
        private notifications: NotificationService,
        private readonly notificationGateway: NotificationGateway,
        private readonly config: ConfigService,
        private readonly timezoneService: TimezoneService
        // private readonly http: HttpService,
    ) { }

    // استخدام الخدمة الموحدة للtimezone
    private getCurrentUTCTime(): Date {
        return this.timezoneService.getCurrentUTCTime();
    }

    private getQuizStatus(
        startsAt: Date,
        endsAt: Date
    ): "UPCOMING" | "ONGOING" | "ENDED" {
        const nowUTC = new Date(); // always use UTC (matches DB)

        if (nowUTC < startsAt) {
            return "UPCOMING";
        }

        if (nowUTC >= startsAt && nowUTC < endsAt) {
            return "ONGOING";
        }

        return "ENDED";
    }


    async getQuizes(userId: number) {
        let quizzes = await this.prisma.quiz.findMany({ where: { createdById: userId } });
        return quizzes.map(
            (q) => {
                const currentStatus = this.getQuizStatus(q.startsAt, q.endsAt);
                return {
                    ...q,
                    currentStatus
                }
            }
        );
    }

    async getQuiz(id: number, userId: number) {
        let quiz = await this.prisma.quiz.findUnique({
            where: { id, createdById: userId },
            include: {
                questions: {
                    include: {
                        question: true, // دي هترجع تفاصيل السؤال نفسه
                    },
                },
            },
        });

        if (!quiz) throw new BadRequestException('Quiz not found');

        const currentStatus = this.getQuizStatus(quiz.startsAt, quiz.endsAt);

        return {
            ...quiz,
            currentStatus,
        };
    }
    // تم حذف الطرق القديمة واستبدالها بخدمة timezone موحدة

    async createQuiz(userId: number, createQuizDto: CreateQuizDto) {
        const startsAtEgypt = new Date(createQuizDto.startsAt);
        const endsAtEgypt = new Date(createQuizDto.endsAt);

        let startsAtUTC: Date;
        let endsAtUTC: Date;

        if (!createQuizDto.startsAt.endsWith('Z')) {
            startsAtUTC = this.timezoneService.convertEgyptTimeToUTC(startsAtEgypt);
        } else {
            startsAtUTC = startsAtEgypt;
        }

        if (!createQuizDto.endsAt.endsWith('Z')) {
            endsAtUTC = this.timezoneService.convertEgyptTimeToUTC(endsAtEgypt);
        } else {
            endsAtUTC = endsAtEgypt;
        }

        if (endsAtUTC <= startsAtUTC) {
            throw new BadRequestException('endsAt must be after startsAt');
        }

        const subject = await this.prisma.subject.findUnique({
            where: { id: createQuizDto.subjectId },
        });
        if (!subject) throw new BadRequestException('Subject not found');

        const group = await this.prisma.group.findUnique({
            where: { id: createQuizDto.groupId },
        });
        if (!group) throw new BadRequestException('Group not found');

        // ❌ ما نحسبش isActive هنا
        const quiz = await this.prisma.quiz.create({
            data: {
                ...createQuizDto,
                createdById: userId,
                isActive: true,   // default, التفعيل الحقيقي يتحكم فيه getAvailableQuizzes
                status: 'DRAFT' as any,
                startsAt: startsAtUTC,
                endsAt: endsAtUTC,
            },
            include: {
                subject: true,
                group: true,
                createdBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return quiz.id;
    }


    async updateQuiz(id: number, userId: number, updateQuizDto: UpdateQuizDto) {
        // validate quiz ownership
        const existing = await this.prisma.quiz.findUnique({ where: { id, createdById: userId } });
        if (!existing) throw new BadRequestException('Quiz not found');
        // recalc isActive if startsAt updated
        let data: any = { ...updateQuizDto };
        if (updateQuizDto.startsAt) {
            const nowEgypt = this.getCurrentUTCTime();
            const startsAtEgypt = new Date(updateQuizDto.startsAt);
            data.isActive = startsAtEgypt <= nowEgypt;
            data.startsAt = startsAtEgypt;
        }
        if (updateQuizDto.endsAt) {
            data.endsAt = new Date(updateQuizDto.endsAt);
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
                const currentStatus = this.getQuizStatus(q.startsAt, q.endsAt);
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
                const currentStatus = this.getQuizStatus(q.startsAt, q.endsAt);
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

    async deleteQuiz(id: number, userId: number) {
        const quiz = await this.prisma.quiz.findUnique({ where: { id, createdById: userId } });
        if (!quiz) throw new BadRequestException('Quiz not found');

        if (quiz.status !== 'DRAFT') throw new BadRequestException('Only draft quizzes can be deleted');

        await this.prisma.quiz.delete({ where: { id } }); // join records also will be deleted

        return "Quiz deleted successfully";
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
        for (const dto of questionDtos) {
            if (dto.type === QuestionType.MCQ && !dto.score) {
                dto.score = 1;
            } else if (dto.type === QuestionType.TrueFalse && !dto.score) {
                dto.score = 2;
            } else if (dto.type === QuestionType.Written && !dto.score) {
                dto.score = 3;
            }
        }

        // Use a transaction to create questions and their relations atomically
        return await this.prisma.$transaction(async (tx) => {
            // Step 1: Create the new question records
            const newQuestions = await Promise.all(
                questionDtos.map(dto =>

                    tx.question.create({
                        data: {
                            score: dto.score!,
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

    async addAiQuestionsToQuiz(
        userId: number,
        quizId: number,
        generateAIQuestionsDto: GenerateAIQuestionsDto,
    ) {
        // 1. تحقق من وجود الكويز
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId, createdById: userId },
        });

        if (!quiz) throw new BadRequestException('Quiz not found');

        // 2. بناء الـ payload للـ AI API
        const aiRequestPayload: any = {
            language: quiz.language || 'en',
            level: generateAIQuestionsDto.difficulty,
            pdf_path: generateAIQuestionsDto.pdfPath,
            n_focus: generateAIQuestionsDto.noOfFocusQuestions,
            focus_pages: generateAIQuestionsDto.focusPages,
            f_mcq_ratio: generateAIQuestionsDto.mcqFocusRatio,
            f_tf_ratio: generateAIQuestionsDto.tfFocusRatio,
            f_written_ratio: generateAIQuestionsDto.writtenFocusRatio,
        };

        if (generateAIQuestionsDto.noOfRemainQuestions && generateAIQuestionsDto.noOfRemainQuestions > 0) {
            aiRequestPayload.n_remain = generateAIQuestionsDto.noOfRemainQuestions;
            aiRequestPayload.remain_pages = generateAIQuestionsDto.remainPages;
            aiRequestPayload.r_mcq_ratio = generateAIQuestionsDto.mcqRemainRatio;
            aiRequestPayload.r_tf_ratio = generateAIQuestionsDto.tfRemainRatio;
            aiRequestPayload.r_written_ratio = generateAIQuestionsDto.writtenRemainRatio;
        }

        // 3. استدعاء الـ AI API
        let response;
        try {
            Logger.debug('AI Request Payload:', JSON.stringify(aiRequestPayload, null, 2));
            response = await axios.post(
                'https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/generate_quiz/',
                aiRequestPayload,
                { headers: { 'Content-Type': 'application/json' } },
            );
        } catch (error) {
            Logger.error('AI API Error:', error?.response?.data || error.message);
            throw new ForbiddenException(
                'Failed to generate AI questions: ' +
                (error?.response?.data?.message || error?.response?.data || error.message),
            );
        }

        Logger.debug('AI Response:', JSON.stringify(response.data, null, 2));

        const dtos = response.data;

        // 4. التحقق من شكل الـ response
        if (!Array.isArray(dtos)) {
            throw new BadRequestException('Invalid response format from AI service');
        }

        // 5. تنظيف البيانات + إعطاء score
        for (const questionDto of dtos) {
            questionDto.question = questionDto.question?.trim();
            questionDto.answer = questionDto.answer?.trim();

            if (questionDto.type === QuestionType.MCQ) {
                questionDto.score = 1;
            } else if (questionDto.type === QuestionType.TrueFalse) {
                questionDto.score = 2;
            } else if (questionDto.type === QuestionType.Written) {
                questionDto.score = 3;
            } else {
                questionDto.score = 1; // default fallback
            }
        }

        // 6. تخزين البيانات + ربطها بالـ quiz
        return await this.prisma.$transaction(async (tx) => {
            // أنشئ الأسئلة
            const createdQuestions = await Promise.all(
                dtos.map((dto) =>
                    tx.question.create({
                        data: {
                            ...dto,
                            createdById: userId,
                            quizId,
                            mode: QuestionMode.AI,
                        },
                    }),
                ),
            );

            // أنشئ روابط في QuizQuestion
            await tx.quizQuestion.createMany({
                data: createdQuestions.map((q) => ({
                    quizId,
                    questionId: q.id,
                })),
            });

            return {
                message: `Successfully added ${createdQuestions.length} questions to the quiz.`,
                addedQuestions: createdQuestions.length,
                totalFocusQuestions: generateAIQuestionsDto.noOfFocusQuestions,
                totalRemainQuestions: generateAIQuestionsDto.noOfRemainQuestions || 0,
            };
        });
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
                        },
                    },
                },
                studentAnswers: {

                    include: {
                        question: true,
                    },
                },
            },
        });

        if (!attempt) {
            throw new NotFoundException('No attempt found for this student and quiz');
        }


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

    async completeQuizAttempt(quizAttemptId: number, userId: number) {
        const attempt = await this.prisma.quizAttempt.findFirst({
            where: { id: quizAttemptId, studentId: userId },
            include: {
                studentAnswers: { include: { question: true } }
            }
        });

        if (!attempt) {
            throw new InternalServerErrorException('Quiz attempt not found');
        }

        let totalScore = 0;
        const results: any[] = [];

        const writtenPayload: {
            max_grade: number;
            questions: WrittenQuestionPayload[];
        } = {
            max_grade: 0,
            questions: [],
        };

        for (const ans of attempt.studentAnswers) {
            const q = ans.question;

            if (q.type === "MCQ" || q.type === "TrueFalse") {
                const isCorrect = ans.answer === q.answer;
                const score = isCorrect ? q.score : 0;
                totalScore += score;

                console.log(`MCQ/TrueFalse question ${q.id} scoring:`, {
                    questionId: q.id,
                    questionText: q.question,
                    correctAnswer: q.answer,
                    studentAnswer: ans.answer,
                    isCorrect,
                    maxScore: q.score,
                    studentScore: score
                });

                await this.prisma.questionAnswer.update({
                    where: { id: ans.id },
                    data: { score }
                });

                results.push({
                    questionId: q.id,
                    questionText: q.question,
                    correctAnswer: q.answer,
                    studentAnswer: ans.answer,
                    maxScore: q.score,
                    studentScore: score,
                });

            } else if (q.type === "Written") {
                writtenPayload.max_grade += q.score ?? 0;
                writtenPayload.questions.push({
                    question_id: q.id.toString(),
                    student_id: attempt.studentId.toString(),
                    group_id: attempt.quizId.toString(),
                    exam_id: attempt.quizId.toString(),
                    question_text: q.question,
                    correct_answer: q.answer,
                    student_answer: ans.answer,
                });
            }
        }

        if (writtenPayload.questions.length > 0) {
            try {
                console.log('Sending written questions to AI for correction:', {
                    questionCount: writtenPayload.questions.length,
                    maxGrade: writtenPayload.max_grade,
                    questions: writtenPayload.questions.map(q => ({
                        question_id: q.question_id,
                        student_id: q.student_id,
                        group_id: q.group_id,
                        exam_id: q.exam_id
                    }))
                });

                const aiResponse = await axios.post(
                    "https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/correct_quiz/",
                    writtenPayload
                );

                // Validate AI response structure
                if (!aiResponse.data || !Array.isArray(aiResponse.data)) {
                    console.error('Invalid AI response structure:', aiResponse.data);
                    throw new InternalServerErrorException(
                        "AI correction service returned invalid response format"
                    );
                }

                console.log('AI correction response received:', {
                    responseCount: aiResponse.data.length,
                    questions: aiResponse.data.map(q => ({
                        question_id: q.question_id,
                        score: q.score
                    }))
                });

                for (const q of aiResponse.data) {
                    // Validate individual question response
                    if (!q.question_id || q.score === undefined || q.score === null) {
                        console.error('Invalid question response from AI:', q);
                        continue; // Skip this question and continue with others
                    }

                    const questionId = parseInt(q.question_id);
                    if (isNaN(questionId)) {
                        console.error('Invalid question_id format:', q.question_id);
                        continue;
                    }

                    const questionInDb = attempt.studentAnswers.find(ans => ans.questionId === questionId)?.question;

                    const maxScore = questionInDb?.score ?? 3; // Default score if not found
                    const aiScore = q.score ?? 0; // Raw AI score

                    // Convert AI score to match question scoring scale
                    // If AI returns percentage (0-100), convert to actual score
                    let studentScore = aiScore;
                    if (aiScore > maxScore && aiScore <= 100) {
                        // AI returned percentage, convert to actual score
                        studentScore = (aiScore / 100) * maxScore;
                    } else if (aiScore > maxScore) {
                        // AI score is higher than max, cap it at max score
                        studentScore = maxScore;
                    }

                    // Ensure score is not negative and not higher than max
                    studentScore = Math.max(0, Math.min(maxScore, studentScore));

                    console.log(`Written question ${questionId} scoring:`, {
                        questionId,
                        maxScore,
                        aiScore,
                        finalStudentScore: studentScore,
                        questionText: questionInDb?.question
                    });

                    totalScore += studentScore;

                    await this.prisma.questionAnswer.updateMany({
                        where: {
                            quizAttemptId: attempt.id,
                            questionId: questionId,
                        },
                        data: { score: studentScore },
                    });

                    results.push({
                        questionId: questionId,
                        questionText: questionInDb?.question ?? q.question_text,
                        correctAnswer: questionInDb?.answer ?? q.correct_answer,
                        studentAnswer: q.student_answer,
                        maxScore: maxScore,
                        studentScore: studentScore,
                    });
                }

            } catch (error) {
                console.error('AI correction API error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });

                // Handle different types of errors
                if (error.response?.status === 500) {
                    throw new InternalServerErrorException(
                        "AI correction service is temporarily unavailable. Please try again later."
                    );
                } else if (error.response?.status >= 400 && error.response?.status < 500) {
                    throw new BadRequestException(
                        "AI correction failed: " + (error.response?.data?.message || error.response?.data?.error || error.message)
                    );
                } else {
                    throw new InternalServerErrorException(
                        "AI correction failed: " + (error.message || "Unknown error occurred")
                    );
                }
            }
        }

        // Calculate total possible score for validation
        const totalPossibleScore = attempt.studentAnswers.reduce((sum, ans) => sum + ans.question.score, 0);

        console.log(`Quiz attempt ${quizAttemptId} completion summary:`, {
            attemptId: quizAttemptId,
            studentId: userId,
            totalScore,
            totalPossibleScore,
            scorePercentage: totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0,
            questionCount: attempt.studentAnswers.length,
            resultsCount: results.length
        });

        const nowUTC = this.getCurrentUTCTime();
        const updatedAttempt = await this.prisma.quizAttempt.update({
            where: { id: quizAttemptId },
            data: { score: totalScore, endedAt: nowUTC }
        });

        return {
            attemptId: updatedAttempt.id,
            totalScore,
            totalPossibleScore,
            scorePercentage: totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0,
            results
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
    // feedback + attempt
    async getStudentFeedbacks(userId: number) {
        return await this.prisma.quizAttempt.findMany({
            where: { studentId: userId },
            include: {
                feedback: {
                    include: {
                        QuestionFeedback: {
                            include: {
                                questionAnswer: {
                                    include: {
                                        question: true
                                    }
                                }
                            }
                        }
                    }
                },
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        subject: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    //single detailed  feedback
    async getStudentFeedback(userId: number, attemptId: number) {
        const attempt = await this.prisma.quizAttempt.findFirst({
            where: { studentId: userId, id: attemptId },
            include: {
                feedback: {
                    include: {
                        QuestionFeedback: {
                            include: {
                                questionAnswer: {
                                    include: {
                                        question: true
                                    }
                                }
                            }
                        }
                    }
                },
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        subject: {
                            select: {
                                title: true
                            }
                        }
                    }
                },
                studentAnswers: {
                    include: {
                        question: true
                    }
                }
            }
        });

        if (!attempt) {
            throw new NotFoundException('Quiz attempt not found');
        }

        if (!attempt.feedback) {
            throw new NotFoundException('No feedback available for this quiz attempt');
        }

        return attempt;
    }

    // Get all feedback for a student across all quizzes
    async getAllStudentFeedback(userId: number) {
        return await this.prisma.quizAttempt.findMany({
            where: {
                studentId: userId,
                feedback: {
                    isNot: null
                }
            },
            include: {
                feedback: {
                    include: {
                        QuestionFeedback: {
                            include: {
                                questionAnswer: {
                                    include: {
                                        question: true
                                    }
                                }
                            }
                        }
                    }
                },
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        subject: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
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

    async getMyQuizAttempts(userId: number) {
        return await this.prisma.quizAttempt.findMany({ where: { studentId: userId }
        , include: {
            studentAnswers: { include: { question: true , quizAttempt: true } },
            quiz: { include: { questions: { include: { question: true } } } }
        }
        
        });
    }

    async getMyQuizAttempt(userId: number, attemptId: number) {
        return await this.prisma.quizAttempt.findFirst({
            where: { studentId: userId, id: attemptId }, include: {
                studentAnswers: { include: { question: true } },
                quiz: { include: { questions: {
                    include: { question : {
                        select: {
                            type: true,
                            question: true,
                            options : true,
                            mode: true,
                            score : true
                        }
                    } }
                } } }
            }
        });
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

        // Check if student already has an attempt for this quiz
        const existingAttempt = await this.prisma.quizAttempt.findFirst({
            where: {
                quizId: quizId,
                studentId: userId
            },
            orderBy: { createdAt: 'desc' } // Get the most recent attempt
        });

       

        const now = new Date();
        // Convert to Egypt timezone (UTC+2)
        const nowUTC = new Date(now.getTime() + (2 * 60 * 60 * 1000));

        console.log('startQuizAttempt - Date validation:', {
            quizId: quizId,
            userId: userId,
            quizStartsAt: quiz.startsAt.toISOString(),
            quizEndsAt: quiz.endsAt.toISOString(),
            currentTime: nowUTC.toISOString(),
            isQuizStarted: quiz.startsAt <= nowUTC,
            isQuizEnded: quiz.endsAt <= nowUTC
        });

        // if (quiz.startsAt > now || quiz.endsAt <= now) {
        //     throw new BadRequestException('Quiz is not available');
        // }

        const attempt = await this.prisma.quizAttempt.create({
            data: {
                quizId,
                studentId: userId,
                startedAt: nowUTC
            }
        });

        console.log('New quiz attempt created:', {
            attemptId: attempt.id,
            quizId: quizId,
            userId: userId,
            startedAt: attempt.startedAt.toISOString()
        });

        await this.notifications.create(quiz.createdById, `Student ${userId} started quiz: ${quiz.title}`, NotificationType.QUIZ_ASSIGNED);
        this.notificationGateway.sendNotification(quiz.createdById.toString(), `Student ${userId} started quiz: ${quiz.title}`);
        return attempt;
    }

    async getQuestionsForAttempt(userId: number, quizAttemptId: number) {
        const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: quizAttemptId, studentId: userId } });
        if (!attempt) throw new BadRequestException('Attempt not found');
        return await this.prisma.question.findMany({
            where: { quizId: attempt.quizId },
            select: {
                id: true,
                question: true,
                type: true,
                options: true,
                createdById: true,
                mode: true,
                score: true,
                answer: true,

            }
        });
    }

    async addQuestionsAnswer(quizAttemptId: number, questionAnswerDtos: QuestionAnswerDto[]) {
        // Validate input data
        if (!questionAnswerDtos || !Array.isArray(questionAnswerDtos)) {
            throw new BadRequestException('questionAnswerDtos must be a valid array');
        }

        if (questionAnswerDtos.length === 0) {
            throw new BadRequestException('questionAnswerDtos array cannot be empty');
        }

        const attempt = await this.prisma.quizAttempt.findUnique({
            where: { id: quizAttemptId },
            include: { quiz: true },
        });
        if (!attempt) throw new BadRequestException('Attempt not found');


        // check if student already answered
        for (const questionAnswerDto of questionAnswerDtos) {
            // Validate individual question answer DTO
            if (!questionAnswerDto || typeof questionAnswerDto !== 'object') {
                throw new BadRequestException('Each question answer must be a valid object');
            }

            if (!questionAnswerDto.questionId || typeof questionAnswerDto.questionId !== 'number') {
                throw new BadRequestException('questionId is required and must be a number');
            }

            if (!questionAnswerDto.answer || typeof questionAnswerDto.answer !== 'string') {
                throw new BadRequestException('answer is required and must be a string');
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



    async getAvailableQuizzes(userId: number) {
        // استخدام الخدمة الموحدة للحصول على الوقت الحالي
        const nowUTC = this.timezoneService.getCurrentUTCTime();
        const nowEgypt = this.timezoneService.getCurrentEgyptTime();

        console.log('getAvailableQuizzes - Date comparison:', {
            currentUTC: nowUTC.toISOString(),
            currentEgypt: nowEgypt.toISOString(),
            userId: userId,
        });

        // البحث عن الكويزات المتاحة (مقارنة بـ UTC لأن البيانات محفوظة بـ UTC)
        const quizzes = await this.prisma.quiz.findMany({
            where: {
                isActive: true,
                startsAt: { lte: nowUTC }, // يبدأ قبل أو يساوي الوقت الحالي
                endsAt: { gt: nowUTC },    // ينتهي بعد الوقت الحالي
                status: 'PUBLIC' as any,   // فقط الكويزات المنشورة
                group: {
                    memberships: {
                        some: {
                            studentId: userId,
                            status: 'APPROVED',
                        },
                    },
                },
            },
            include: {
                group: true,
                subject: true,
            },
        });

        // تحويل التواريخ إلى توقيت مصر للعرض
        return quizzes.map(quiz => ({
            ...quiz,
            startsAt: this.timezoneService.convertUTCToEgyptTime(quiz.startsAt),
            endsAt: this.timezoneService.convertUTCToEgyptTime(quiz.endsAt),
        }));
    }








    async requestFeedbackStudent(userId: number, quizId: number) {
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId, createdById: userId },
            include: {
                attempts: {
                    include: {
                        studentAnswers: {
                            include: { question: true },
                        },
                    },
                },
            },
        });

        if (!quiz) {
            throw new NotFoundException('Quiz not found');
        }

        let response;
        try {
            response = await axios.post(
                'https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/feedback_student',
                quiz.attempts.map((attempt) => ({
                    attempt_id: attempt.id.toString(),
                    answers: attempt.studentAnswers.map((sa) => ({
                        answer_id: sa.id.toString(), // studentAnswer.id
                        question: sa.question.question,
                        student_answer: sa.answer,
                        correct_answer: sa.question.answer,
                        type: sa.question.type,
                        options: sa.question.options,
                        is_correct: sa.question.answer === sa.answer,
                        q_weight: sa.question.score,
                        score: sa.score,
                    })),
                })),
            );
            Logger.debug(response.data);
        } catch (error) {
            throw new BadRequestException(error.message);
        }

        const attempts = response.data;

        for (const attempt of attempts) {
            // 1️⃣ أنشئ أو حدث AttemptFeedback
            const attemptFeedback = await this.prisma.attemptFeedback.upsert({
                where: {
                    attemptId: parseInt(attempt.attempt_id, 10),
                },
                update: {
                    summary: attempt.summary ?? "No summary",
                    weakPoints: attempt.weak_points ?? [],
                    goodPoints: attempt.good_points ?? [],
                },
                create: {
                    attemptId: parseInt(attempt.attempt_id, 10),
                    summary: attempt.summary ?? "No summary",
                    weakPoints: attempt.weak_points ?? [],
                    goodPoints: attempt.good_points ?? [],
                },
            });

            // 2️⃣ احذف QuestionFeedback القديم إذا كان موجود
            await this.prisma.questionFeedback.deleteMany({
                where: {
                    attemptFeedbackId: attemptFeedback.id,
                },
            });

            // 3️⃣ جهّز الداتا الخاصة بالـ QuestionFeedback
            const data = attempt.results.map((result) => ({
                questionAnswerId: parseInt(result.answer_id, 10),
                feedback: result.feedback,
                attemptFeedbackId: attemptFeedback.id,
            }));

            // 4️⃣ خزّن كل QuestionFeedback
            await this.prisma.questionFeedback.createMany({ data });
        }

        return { message: "Feedback stored successfully" };
    }





    async getRequestedFeedbackTeacher(userId: number, studentId: number) {
        return await this.prisma.studentFeedback.findMany({
            where: { teacherId: userId, studentId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async requestFeedbackTeacher(userId: number, studentId: number) {
        const student = await this.prisma.user.findUnique({
            where: { id: studentId },
            include: {
                quizAttempts: {
                    include: {
                        studentAnswers: { include: { question: true } },
                        feedback: true,
                    },
                    orderBy: { createdAt: 'asc' }, // كل الامتحانات حسب الوقت
                },
            },
        });

        if (!student) {
            throw new InternalServerErrorException('Student not found');
        }

        if (!student.quizAttempts || student.quizAttempts.length === 0) {
            throw new BadRequestException('Student has no quiz attempts');
        }


        const apiPayload = {
            student_id: studentId.toString(),
            history: student.quizAttempts.map((attempt) => ({
                attempt_id: attempt.id.toString(),
                score: attempt.score ?? 0,
                max_score: attempt.studentAnswers.reduce(
                    (acc, sa) => acc + (sa.question.score ?? 0),
                    0
                ),
                strong_points: attempt.feedback?.goodPoints ?? [],
                weak_points: attempt.feedback?.weakPoints ?? [],
            })),
        };

        let response;
        try {
            response = await axios.post(
                'https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/feedback_teacher',
                apiPayload
            );
        } catch (error: any) {
            throw new InternalServerErrorException(
                'Failed to generate teacher feedback: ' +
                (error?.response?.data?.message || error.message)
            );
        }

        const data = response.data || {};

        // Normalize types for Prisma schema
        const toStringArray = (v: any): string[] => Array.isArray(v) ? v.map((x) => String(x)) : [];
        const toNumberArray = (v: any): number[] => Array.isArray(v) ? v.map((x) => Number(x) || 0) : [];

        return await this.prisma.studentFeedback.upsert({
            where: {
                studentId_teacherId: { studentId, teacherId: userId },
            },
            update: {
                progress: String(data.progress ?? ''),
                summaryFeedback: String(data.summary_feedback ?? ''),
                strongPoints: toStringArray(data.strong_points),
                weakPoints: toStringArray(data.weak_points),
                improvedPoints: toStringArray(data.improved_points),
                declinedPoints: toStringArray(data.declined_points),
                unchangedPoints: toStringArray(data.unchanged_points),
                scoreTrend: toNumberArray(data.score_trend),
                riskLevel: String(data.risk_level ?? 'unknown'),
                teachingRecommendation: String(data.teaching_recommendation ?? ''),
            },
            create: {
                studentId,
                teacherId: userId,
                progress: String(data.progress ?? ''),
                summaryFeedback: String(data.summary_feedback ?? ''),
                strongPoints: toStringArray(data.strong_points),
                weakPoints: toStringArray(data.weak_points),
                improvedPoints: toStringArray(data.improved_points),
                declinedPoints: toStringArray(data.declined_points),
                unchangedPoints: toStringArray(data.unchanged_points),
                scoreTrend: toNumberArray(data.score_trend),
                riskLevel: String(data.risk_level ?? 'unknown'),
                teachingRecommendation: String(data.teaching_recommendation ?? ''),
            },
        });
    }

    async requestGroupFeedback(groupId: number, feedback_language: string) {
        // 1️⃣ جلب كل الطلاب في المجموعة وكل امتحاناتهم
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                memberships: {
                    include: {
                        student: {
                            include: {
                                quizAttempts: {
                                    include: {
                                        studentAnswers: { include: { question: true } },
                                        feedback: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!group) {
            throw new InternalServerErrorException('Group not found');
        }

        // 2️⃣ تجهيز الـ payload للـ AI API
        const studentFeedbacks = group.memberships.map(({ student }) => {
            const attempts = student.quizAttempts;
            if (!attempts || attempts.length === 0) return null;

            const latestAttempt = attempts[attempts.length - 1]; // أحدث attempt
            const mostWrongQuestions = latestAttempt.studentAnswers
                .filter((sa) => sa.answer !== sa.question.answer)
                .map((sa) => sa.question.question);

            const avgScoreThisQuiz = latestAttempt.score ?? 0;
            const avgScorePrev = attempts.slice(0, -1).map((a) => a.score ?? 0);
            // Calculate success rate based on actual scores (weighted)
            const totalPossibleScore = latestAttempt.studentAnswers.reduce((sum, sa) => sum + sa.question.score, 0);
            const actualScore = latestAttempt.score ?? 0;

            // Debug logging
            console.log(`Student ${student.id} - Score calculation:`, {
                actualScore,
                totalPossibleScore,
                studentAnswers: latestAttempt.studentAnswers.map(sa => ({
                    questionId: sa.questionId,
                    questionScore: sa.question.score,
                    studentAnswer: sa.answer,
                    correctAnswer: sa.question.answer,
                    isCorrect: sa.answer === sa.question.answer
                }))
            });

            // Calculate success rate - use calculated score if stored score seems incorrect
            let calculatedScore = 0;
            for (const sa of latestAttempt.studentAnswers) {
                if (sa.answer === sa.question.answer) {
                    calculatedScore += sa.question.score;
                }
            }

            // Use calculated score if it's more reasonable than stored score
            const scoreToUse = (actualScore > totalPossibleScore && calculatedScore <= totalPossibleScore)
                ? calculatedScore
                : actualScore;

            const successRateThisQuiz = totalPossibleScore === 0
                ? 0
                : Math.min(100, (scoreToUse / totalPossibleScore) * 100);

            console.log(`Student ${student.id} - Final calculation:`, {
                storedScore: actualScore,
                calculatedScore,
                scoreUsed: scoreToUse,
                totalPossibleScore,
                successRate: successRateThisQuiz
            });

            const successRatePrev = attempts.slice(0, -1).map((a) => {
                const attemptTotalScore = a.studentAnswers.reduce((sum, sa) => sum + sa.question.score, 0);
                return attemptTotalScore === 0
                    ? 0
                    : Math.min(100, ((a.score ?? 0) / attemptTotalScore) * 100);
            });

            return {
                student_id: student.id.toString(),
                summary: latestAttempt.feedback?.summary ?? '',
                strengths: latestAttempt.feedback?.goodPoints ?? [],
                weaknesses: latestAttempt.feedback?.weakPoints ?? [],
                most_wrong_questions: mostWrongQuestions,
                avg_score_this_quiz: scoreToUse, // Use the corrected score
                avg_score_prev: avgScorePrev,
                success_rate_this_quiz: successRateThisQuiz,
                success_rate_prev: successRatePrev,
            };
        }).filter(Boolean) as any[];

        // Validate that we have student feedback data
        if (studentFeedbacks.length === 0) {
            throw new InternalServerErrorException('No student feedback data found for this group');
        }

        // Additional validation for meaningful data
        const hasValidFeedback = studentFeedbacks.some(s =>
            s.summary && s.summary.trim() !== '' &&
            (s.strengths.length > 0 || s.weaknesses.length > 0)
        );

        if (!hasValidFeedback) {
            console.warn('Warning: No meaningful feedback data found for students in this group');
        }

        // Calculate aggregated data
        const allWrongQuestions = studentFeedbacks.flatMap((s: any) => s.most_wrong_questions || []);
        const allPrevScores = studentFeedbacks.flatMap((s: any) => s.avg_score_prev || []);
        const allPrevSuccessRates = studentFeedbacks.flatMap((s: any) => s.success_rate_prev || []);

        const avgScoreThisQuiz = Number(
            (studentFeedbacks.reduce((acc: number, s: any) => acc + (s.avg_score_this_quiz || 0), 0) /
                studentFeedbacks.length).toFixed(2)
        );

        const avgSuccessRateThisQuiz = Number(
            (studentFeedbacks.reduce((acc: number, s: any) => acc + (s.success_rate_this_quiz || 0), 0) /
                studentFeedbacks.length).toFixed(2)
        );

        const payload: GroupFeedbackRequestDto = {
            most_wrong_questions: allWrongQuestions.length > 0 ? allWrongQuestions : ["No specific wrong questions identified"],
            avg_score_this_quiz: avgScoreThisQuiz,
            avg_score_prev: allPrevScores.length > 0 ? allPrevScores.map(score => Number(score)) : [0],
            success_rate_this_quiz: avgSuccessRateThisQuiz,
            success_rate_prev: allPrevSuccessRates.length > 0 ? allPrevSuccessRates.map(rate => Number(rate)) : [0],
            individual_feedback: studentFeedbacks.map((s: any) => ({
                student_id: String(s.student_id || ''),
                summary: String(s.summary || 'No summary available'),
                strengths: Array.isArray(s.strengths) && s.strengths.length > 0 ? s.strengths : ["General performance"],
                weaknesses: Array.isArray(s.weaknesses) && s.weaknesses.length > 0 ? s.weaknesses : ["Areas for improvement"],
            }))
        };

        // 3️⃣ استدعاء AI API
        console.log('Sending payload to AI API:', JSON.stringify(payload, null, 2));
        console.log('Payload validation:', {
            hasWrongQuestions: payload.most_wrong_questions.length > 0,
            hasPrevScores: payload.avg_score_prev.length > 0,
            hasPrevSuccessRates: payload.success_rate_prev.length > 0,
            individualFeedbackCount: payload.individual_feedback.length,
            avgScoreThisQuiz: payload.avg_score_this_quiz,
            successRateThisQuiz: payload.success_rate_this_quiz
        });

        // Debug individual student data
        console.log('Individual student data:', studentFeedbacks.map(s => ({
            student_id: s.student_id,
            avg_score_this_quiz: s.avg_score_this_quiz,
            success_rate_this_quiz: s.success_rate_this_quiz,
            most_wrong_questions: s.most_wrong_questions,
            avg_score_prev: s.avg_score_prev,
            success_rate_prev: s.success_rate_prev
        })));

        let response;
        try {
            response = await axios.post(
                `https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/group_feedback/?feedback_language=${feedback_language}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },

                }
            );
        } catch (error: any) {
            console.error('AI API Error Details:', {
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                message: error?.message,
                code: error?.code,
                url: error?.config?.url,
                payload: error?.config?.data
            });

            // Provide more specific error messages based on the status code
            let errorMessage = 'Failed to generate group feedback';
            if (error?.response?.status === 500) {
                errorMessage = 'AI service is currently unavailable or experiencing issues. Please try again later.';
            } else if (error?.response?.status === 422) {
                errorMessage = 'Invalid data format sent to AI service. Please check the quiz data.';
            } else if (error?.response?.status === 400) {
                errorMessage = 'Bad request to AI service. Please verify the group and quiz data.';
            } else if (error?.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. AI service is taking too long to respond.';
            }

            // If it's a 500 error, we can provide a fallback response
            if (error?.response?.status === 500) {
                console.warn('AI service returned 500, providing fallback response');
                return this.generateFallbackGroupFeedback(payload, studentFeedbacks);
            }

            throw new InternalServerErrorException(errorMessage);
        }

        const data = response.data || {};
        return data;
    }

    private generateFallbackGroupFeedback(payload: any, studentFeedbacks: any[]) {
        // Generate a basic fallback response when AI service is unavailable
        const avgScore = payload.avg_score_this_quiz;
        const avgSuccessRate = payload.success_rate_this_quiz;

        console.log('Fallback response data:', {
            avgScore,
            avgSuccessRate,
            payloadKeys: Object.keys(payload)
        });

        let overallSummary = '';
        if (avgSuccessRate >= 80) {
            overallSummary = 'The group shows strong performance with high success rates.';
        } else if (avgSuccessRate >= 60) {
            overallSummary = 'The group demonstrates moderate performance with room for improvement.';
        } else {
            overallSummary = 'The group needs additional support and practice to improve performance.';
        }

        return {
            group_summary: overallSummary,
            average_score: avgScore,
            average_success_rate: avgSuccessRate,
            total_students: studentFeedbacks.length,
            recommendations: [
                avgSuccessRate < 70 ? 'Consider additional practice sessions' : 'Continue current learning approach',
                avgSuccessRate < 80 ? 'Focus on fundamental concepts' : 'Introduce advanced topics',
                'Regular progress monitoring recommended'
            ],
            individual_insights: studentFeedbacks.map(student => ({
                student_id: student.student_id,
                performance_level: student.success_rate_this_quiz >= 80 ? 'High' : student.success_rate_this_quiz >= 60 ? 'Medium' : 'Low',
                key_strengths: student.strengths.length > 0 ? student.strengths : ['General competency'],
                areas_for_improvement: student.weaknesses.length > 0 ? student.weaknesses : ['Overall development']
            })),
            note: 'This is a fallback response generated due to AI service unavailability.'
        };
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
