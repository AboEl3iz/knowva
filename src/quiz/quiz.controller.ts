import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    Query,
    Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AuthenticationGuard } from '../guards/authentication.guard';
import { AuthorizationGuard } from '../guards/authorization.guard';
import { Roles } from '../decorator/decorator/roles.decorator';
import { Role } from '../decorator/enums/roles';
import { GenerateAIQuestionsDto } from './dto/generate-ai-questions.dto';
import { QuestionAnswerDto } from './dto/question-answer.dto';
import { StudentFeedbackResponseDto } from './dto/student-feedback-response.dto';

@ApiTags('Quiz')
@Controller('quiz')
@ApiBearerAuth()

export class QuizController {
    constructor(private readonly quizService: QuizService) { }

    // Quiz Management Endpoints
    @Get()
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get all quizzes for the authenticated teacher' })
    @ApiResponse({ status: 200, description: 'List of quizzes retrieved successfully' })
    /**
     * Retrieves all quizzes for the authenticated teacher
     *
     * @returns A list of quiz objects
     */
    async getQuizzes(@Request() req) {
        return await this.quizService.getQuizes(req.user.id);
    }

    @Get(':id')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get a specific quiz by ID' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiResponse({ status: 200, description: 'Quiz retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })

    /**
     * Retrieves a specific quiz by ID
     *
     * @param id The ID of the quiz to retrieve
     * @returns The quiz object
     */
    async getQuiz(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.getQuiz(id, req.user.id);
    }

    @Post()
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Create a new quiz' })
    @ApiBody({ type: CreateQuizDto })
    @ApiResponse({ status: 201, description: 'Quiz created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    /**
     * Creates a new quiz for the authenticated teacher
     *
     * @param createQuizDto The quiz details
     * @returns The created quiz object
     */
    async createQuiz(@Body() createQuizDto: CreateQuizDto, @Request() req) {
        return await this.quizService.createQuiz(req.user.id, createQuizDto);
    }

    @Put(':id')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Update a quiz' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiBody({ type: UpdateQuizDto })
    @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })
    /**
     * Updates a quiz for the authenticated teacher
     *
     * @param id The ID of the quiz to update
     * @param updateQuizDto The updated quiz details
     * @returns The updated quiz object
     */
    async updateQuiz(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateQuizDto: UpdateQuizDto,
        @Request() req
    ) {
        return await this.quizService.updateQuiz(id, req.user.id, updateQuizDto);
    }

    @Post(':id/duplicate')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Duplicate a quiz' })
    @ApiParam({ name: 'id', description: 'Quiz ID to duplicate' })
    @ApiResponse({ status: 201, description: 'Quiz duplicated successfully' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })


    /**
     * Duplicates a quiz for the authenticated teacher
     *
     * @param id The ID of the quiz to duplicate
     * @returns The duplicated quiz object
     */
    async duplicateQuiz(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.duplicateQuiz(id, req.user.id);
    }


    @Delete(':id')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Delete a quiz' })
    @ApiParam({ name: 'id', description: 'Quiz ID to delete' })
    @ApiResponse({ status: 204, description: 'Quiz deleted successfully' })
    @ApiResponse({ status: 400, description: 'Only draft quizzes can be deleted' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })
    /**
     * Deletes a quiz for the authenticated teacher
     *
     * @param id The ID of the quiz to delete
     * @returns A success message
     */
    async deleteQuiz(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.deleteQuiz(id, req.user.id);
    }

    // Question Management Endpoints
    @Get('questions/all')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get all questions for the authenticated teacher' })
    @ApiResponse({ status: 200, description: 'List of questions retrieved successfully' })
    /**
     * Retrieves all questions for the authenticated teacher
     *
     * @returns List of questions
     */
    async getQuestions(@Request() req) {
        return await this.quizService.getQuestions(req.user.id);
    }

    @Get('question/:id')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get a specific question by ID' })
    @ApiParam({ name: 'id', description: 'Question ID' })
    @ApiResponse({ status: 200, description: 'Question retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Question not found' })
    /**
     * Retrieves a specific question by ID for the authenticated teacher
     *
     * @param id The ID of the question to retrieve
     * @returns The question object
     */
    async getQuestion(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.getQuestion(id, req.user.id);
    }

    @Post(':quizId/questions')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Add a manual question to a quiz' })
    @ApiParam({ name: 'quizId', description: 'Quiz ID' })
    @ApiBody({
        type: [CreateQuestionDto],
        description: 'Array of questions to add to the quiz'
    })
    @ApiResponse({ status: 201, description: 'Questions added to quiz successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    /**
     * Adds a manual question to a quiz for the authenticated teacher
     *
     * @param quizId The ID of the quiz to add the question to
     * @param createQuestionDtos The question data to add to the quiz
     * @returns The added questions
     */
    async addManualQuestionsToQuiz(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Body() createQuestionDtos: CreateQuestionDto[],
        @Request() req
    ) {
        const questionsToProcess = Array.isArray(createQuestionDtos)
            ? createQuestionDtos
            : [createQuestionDtos];
        return await this.quizService.addManualQuestionsToQuiz(req.user.id, quizId, questionsToProcess);
    }

    @Post(':quizId/questions/:questionId')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Add an existing question to a quiz' })
    @ApiParam({ name: 'quizId', description: 'Quiz ID' })
    @ApiParam({ name: 'questionId', description: 'Question ID to add' })
    @ApiResponse({ status: 200, description: 'Question added to quiz successfully' })
    @ApiResponse({ status: 404, description: 'Quiz or question not found' })
    /**
     * Adds an existing question to a quiz for the authenticated teacher
     *
     * @param quizId The ID of the quiz to add the question to
     * @param questionId The ID of the question to add
     * @returns The created question
     */

    async addOldQuestionToQuiz(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Request() req
    ) {
        return await this.quizService.addOldQuestionToQuiz(req.user.id, quizId, questionId);
    }

    @Post('questions/ai/:quizId')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Add AI-generated questions to a quiz' })
    @ApiParam({ name: 'quizId', description: 'Quiz ID' })
    @ApiBody({ type: GenerateAIQuestionsDto, description: 'AI question generation parameters' })
    @ApiResponse({ status: 201, description: 'AI questions added to quiz successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })
    /**
     * Adds AI-generated questions to a quiz for the authenticated teacher
     *
     * @param quizId The ID of the quiz to add the questions to
     * @param noOfQuestions The number of AI questions to add
     * @returns The created questions
     */
    async addAiQuestionsToQuiz(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Body() generateAIQuestionsDto: GenerateAIQuestionsDto,
        @Request() req
    ) {
        return await this.quizService.addAiQuestionsToQuiz(req.user.id, quizId, generateAIQuestionsDto);
    }

    @Post('questions/:id/duplicate')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Duplicate a question' })
    @ApiParam({ name: 'id', description: 'Question ID to duplicate' })
    @ApiResponse({ status: 201, description: 'Question duplicated successfully' })
    @ApiResponse({ status: 404, description: 'Question not found' })
    /**
     * Duplicates a question for the authenticated teacher
     *
     * @param id The ID of the question to duplicate
     * @returns The duplicated question
     */
    async duplicateQuestion(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.duplicateQuestion(req.user.id, id);
    }

    @Put('questions/:id')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Update a question' })
    @ApiParam({ name: 'id', description: 'Question ID' })
    @ApiBody({ type: UpdateQuestionDto })
    @ApiResponse({ status: 200, description: 'Question updated successfully' })
    @ApiResponse({ status: 404, description: 'Question not found' })
    /**
     * Updates a question for the authenticated teacher
     *
     * @param id The ID of the question to update
     * @param updateQuestionDto The question data to update
     * @returns The updated question
     */
    async updateQuestion(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateQuestionDto: UpdateQuestionDto,
        @Request() req
    ) {
        return await this.quizService.updateQuestion(req.user.id, id, updateQuestionDto);
    }

    @Delete('questions/:questionId/:quizId/remove-from-quiz')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Remove a question from its quiz' })
    @ApiParam({ name: 'id', description: 'Question ID' })
    @ApiResponse({ status: 200, description: 'Question removed from quiz successfully' })
    @ApiResponse({ status: 404, description: 'Question not found' })
    /**
     * Removes a question from its associated quiz for the authenticated teacher
     *
     * @param questionId The ID of the question to remove
     * @param quizId The ID of the quiz to remove the question from
     * @returns The result of the removal operation
     */
    async removeQuestionFromQuiz(
        @Param('questionId', ParseIntPipe) questionId: number,
        @Param('quizId', ParseIntPipe) quizId: number,
        @Request() req) {
        return await this.quizService.removeQuestionFromQuiz(req.user.id, questionId, quizId);
    }

    @Delete('questions/:id')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a question' })
    @ApiParam({ name: 'id', description: 'Question ID' })
    @ApiResponse({ status: 204, description: 'Question deleted successfully' })
    @ApiResponse({ status: 404, description: 'Question not found' })
    /**
     * Deletes a question for the authenticated teacher
     *
     * @param id The ID of the question to delete
     * @returns The deleted question
     */
    async deleteQuestion(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.deleteQuestion(req.user.id, id);
    }

    // Quiz Attempt Endpoints
    @Get(':id/attempts/my')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get my quiz attempts' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiResponse({ status: 200, description: 'Quiz attempts retrieved successfully' })
    /**
     * Retrieves all quiz attempts for the authenticated student for a quiz
     *
     * @param id The ID of the quiz to retrieve attempts for
     * @returns The quiz attempts
     */
    async getMyQuizAttempts(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.getMyQuizAttempts(req.user.id, id);
    }

    @Get(':id/attempts')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get all quiz attempts for a quiz' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiResponse({ status: 200, description: 'Quiz attempts retrieved successfully' })
    /**
     * Retrieves all quiz attempts for a quiz for the authenticated teacher
     *
     * @param id The ID of the quiz to retrieve attempts for
     * @returns The quiz attempts
     */
    async getQuizAttempts(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.getQuizAttempts(id, req.user.id);
    }

    @Post(':id/start')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Start a quiz attempt' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiResponse({ status: 201, description: 'Quiz attempt started successfully' })
    @ApiResponse({ status: 400, description: 'Quiz not available for attempt' })
    /**
     * Starts a quiz attempt for the authenticated student
     *
     * @param id The ID of the quiz to start the attempt for
     * @returns The started quiz attempt
     */
    async startQuizAttempt(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.startQuizAttempt(req.user.id, id);
    }

    @Get('attempts/:quizAttemptId/questions')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get questions for a quiz attempt' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Quiz attempt not found' })
    /**
     * Retrieves questions for a quiz attempt for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to retrieve questions for
     * @returns The questions for the quiz attempt
     */
    async getQuestionsForAttempt(@Param('quizAttemptId', ParseIntPipe) quizAttemptId: number, @Request() req) {
        return await this.quizService.getQuestionsForAttempt(req.user.id, quizAttemptId);
    }


    @Post('attempts/:quizAttemptId/answers')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Add an answer to a quiz attempt' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiBody({ type: [QuestionAnswerDto] })
    @ApiResponse({ status: 201, description: 'Answer added successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })

    /**
     * Adds answers to a quiz attempt for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to add answers to
     * @param body The answers to add
     * @returns The updated quiz attempt
     */
    async addQuestionsAnswer(
        @Param('quizAttemptId', ParseIntPipe) quizAttemptId: number,
        @Body() body: QuestionAnswerDto[]
    ) {
        return await this.quizService.addQuestionsAnswer(quizAttemptId, body);
    }

    @Post('attempts/:quizAttemptId/complete')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Complete a quiz attempt' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiResponse({ status: 200, description: 'Quiz attempt completed successfully' })
    @ApiResponse({ status: 404, description: 'Quiz attempt not found' })

    /**
     * Completes a quiz attempt for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to complete
     * @returns The completed quiz attempt
     */
    async completeQuizAttempt(@Param('quizAttemptId', ParseIntPipe) quizAttemptId: number, @Request() req) {
        return await this.quizService.completeQuizAttempt(quizAttemptId, req.user.id);
    }

    @Get('attempts/:quizAttemptId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get quiz attempt details' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiResponse({ status: 200, description: 'Quiz attempt retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Quiz attempt not found' })
    /**
     * Retrieves a quiz attempt by ID for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to retrieve
     * @returns The quiz attempt object
     */
    async getQuizAttempt(@Param('quizAttemptId', ParseIntPipe) quizAttemptId: number, @Request() req) {
        return await this.quizService.getQuizAttempt(quizAttemptId, req.user.id);
    }

    @Get('available')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get available quizzes for student' })
    @ApiResponse({ status: 200, description: 'Available quizzes retrieved successfully' })
    /**
     * Retrieves all quizzes that the authenticated student is eligible to attempt
     *
     * @returns The available quizzes
     */
    getAvailableQuizzes(@Req() req: any) {

        console.log('req.user:', req.user);
        console.log('req.user.id:', req.user.id);
        console.log('typeof req.user.id:', typeof req.user.id);
        console.log('converted:', +req.user.id);
        return this.quizService.getAvailableQuizzes(req.user.id);
    }



    @Post(':id/request-feedback')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Request AI feedback for quiz attempts' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiResponse({ status: 200, description: 'Feedback generated successfully' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })
    /**
     * Requests AI feedback for a quiz for the authenticated teacher
     *
     * @param id The ID of the quiz to generate feedback for
     * @returns The feedback generated by the AI
     */
    async requestFeedbackStudent(@Param('id', ParseIntPipe) id: number, @Request() req) {
        return await this.quizService.requestFeedbackStudent(req.user.id, id);
    }

    // @Get('student/feedback/:quizAttemptId')
    // @Roles(Role.TEACHER)
    // @UseGuards(AuthenticationGuard, AuthorizationGuard)
    // @ApiOperation({ summary: 'Get student feedback for a quiz attempt' })
    // @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    // @ApiResponse({ status: 200, description: 'Student feedback retrieved successfully' })
    // @ApiResponse({ status: 404, description: 'Quiz attempt not found' })
    // /**
    //  * Retrieves student feedback for a quiz attempt for the authenticated teacher
    //  *
    //  * @param quizAttemptId The ID of the quiz attempt to retrieve feedback for
    //  * @returns The student feedback
    //  */
    // async getFeedbackStudent(@Param('quizAttemptId', ParseIntPipe) quizAttemptId: number, @Request() req) {
    //     return await this.quizService.getStudentFeedback(req.user.id, quizAttemptId);
    // }

    // @Get('student/feedback/all')
    // @Roles(Role.TEACHER)
    // @UseGuards(AuthenticationGuard, AuthorizationGuard)
    // @ApiOperation({ summary: 'Get all student feedback' })
    // @ApiResponse({ status: 200, description: 'All student feedback retrieved successfully' })
    // /**
    //  * Retrieves all student feedback for the authenticated teacher
    //  *
    //  * @returns All student feedback
    //  */
    // async getAllFeedbackStudent(@Request() req) {
    //     return await this.quizService.getStudentFeedbacks(req.user.id);
    // }

    @Get(':groupId/request-feedback')
    async getGroupFeedback(
        @Param('groupId') groupId: number,
        @Query('feedback_language') feedback_language: string = 'en',
    ) {
        return this.quizService.requestGroupFeedback(groupId, feedback_language);
    }

    // Student endpoints for viewing their own feedback
    @Get('student/feedback/:attemptId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get detailed feedback for a specific quiz attempt (Student)' })
    @ApiParam({ name: 'attemptId', description: 'Quiz Attempt ID' })
    @ApiResponse({
        status: 200,
        description: 'Student feedback retrieved successfully',
        type: StudentFeedbackResponseDto
    })
    @ApiResponse({ status: 404, description: 'Quiz attempt not found or no feedback available' })
    /**
     * Retrieves detailed feedback for a specific quiz attempt for the authenticated student
     *
     * @param attemptId The ID of the quiz attempt to retrieve feedback for
     * @returns The detailed student feedback including question-level feedback
     */
    async getStudentFeedback(@Param('attemptId', ParseIntPipe) attemptId: number, @Request() req) {
        return await this.quizService.getStudentFeedback(req.user.id, attemptId);
    }

    @Get('student/feedback')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get all feedback for the authenticated student' })
    @ApiResponse({
        status: 200,
        description: 'All student feedback retrieved successfully',
        type: [StudentFeedbackResponseDto]
    })
    /**
     * Retrieves all feedback for the authenticated student across all quizzes
     *
     * @returns All student feedback with quiz information
     */
    async getAllStudentFeedback(@Request() req) {
        return await this.quizService.getAllStudentFeedback(req.user.id);
    }

    @Get('feedback/teacher/:studentId')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiResponse({
        status: 200,
        description: 'Teacher feedback requests for a student retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                studentId: { type: 'number' },
                teacherId: { type: 'number' },
                progress: { type: 'string' },
                summaryFeedback: { type: 'string' },
                strongPoints: { type: 'array', items: { type: 'string' } },
                weakPoints: { type: 'array', items: { type: 'string' } },
                improvedPoints: { type: 'array', items: { type: 'string' } },
                declinedPoints: { type: 'array', items: { type: 'string' } },
                unchangedPoints: { type: 'array', items: { type: 'string' } },
                scoreTrend: { type: 'array', items: { type: 'number' } },
                riskLevel: { type: 'string' },
                teachingRecommendation: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                userId: { type: 'number', nullable: true },
            },
        },
    })
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get teacher feedback requests for a student' })
    @ApiParam({ name: 'studentId', description: 'Student ID' })
    /**
     * Retrieves all teacher feedback requests for a student for the authenticated teacher
     *
     * @param studentId The ID of the student to retrieve feedback requests for
     * @returns The feedback requests
     */
    async getRequestedFeedbackTeacher(@Param('studentId', ParseIntPipe) studentId: number, @Request() req) {
        return await this.quizService.getRequestedFeedbackTeacher(studentId, req.user.id);
    }

    @Post('feedback/teacher/:studentId')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Request AI teacher feedback for student performance' })
    @ApiParam({ name: 'studentId', description: 'Student ID' })
    @ApiResponse({
        status: 200,
        description: 'Teacher feedback generated successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Feedback stored successfully' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    /**
     * Requests AI teacher feedback for a student's performance for the authenticated teacher
     *
     * @param studentId The ID of the student to generate feedback for
     * @returns The feedback generated by the AI
     */
    async requestFeedbackTeacher(
        @Param('studentId', ParseIntPipe) studentId: number,
        @Request() req
    ) {
        return await this.quizService.requestFeedbackTeacher(req.user.id, studentId);
    }


    //update status quiz
    @Put(':id/status')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Update quiz status' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    // @ApiBody({ type:  UpdateQuizDto  })
    @ApiResponse({ status: 200, description: 'Quiz status updated successfully' })
    @ApiResponse({ status: 404, description: 'Quiz not found' })
    async updateQuizStatus(@Param('id', ParseIntPipe) id: number, @Body() updateQuizDto: { status: 'DRAFT' | 'PUBLIC' }, @Request() req) {
        return await this.quizService.updateQuizStatus(id, +req.user.id, updateQuizDto.status);
    }


    @Get(':quizId/correct')
    @Roles(Role.TEACHER)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    async correctQuiz(
        @Req() req: any,
        @Param('quizId', ParseIntPipe) quizId: number,
    ) {
        return this.quizService.correctQuiz(+req.user.id, quizId);
    }


}

/**
 * Student 2 - Score calculation: {
  actualScore: 21,
  totalPossibleScore: 15,
  studentAnswers: [
    {
      questionId: 1,
      questionScore: 5,
      studentAnswer: "A",
      correctAnswer: "A", 
      isCorrect: true
    },
    // ... more questions
  ]
}

Student 2 - Final calculation: {
  storedScore: 21,
  calculatedScore: 15,
  scoreUsed: 15,
  totalPossibleScore: 15,
  successRate: 100
}
 */
