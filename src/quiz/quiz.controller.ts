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

@ApiTags('Quiz')
@Controller('quiz')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@ApiBearerAuth()
export class QuizController {
    constructor(private readonly quizService: QuizService) { }

    // Quiz Management Endpoints
    @Get()
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Get all quizzes for the authenticated teacher' })
    @ApiResponse({ status: 200, description: 'List of quizzes retrieved successfully' })
    /**
     * Retrieves all quizzes for the authenticated teacher
     *
     * @returns A list of quiz objects
     */
    async getQuizzes(@Request() req) {
        return this.quizService.getQuizes(req.user.id);
    }

    @Get(':id')
    @Roles(Role.TEACHER)
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
        return this.quizService.getQuiz(id, req.user.id);
    }

    @Post()
    @Roles(Role.TEACHER)
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
        return this.quizService.createQuiz(req.user.id, createQuizDto);
    }

    @Put(':id')
    @Roles(Role.TEACHER)
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
        return this.quizService.updateQuiz(id, req.user.id, updateQuizDto);
    }

    @Put(':id/status')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Update quiz status (DRAFT/PUBLIC)' })
    @ApiParam({ name: 'id', description: 'Quiz ID' })
    @ApiBody({ schema: { type: 'object', properties: { status: { enum: ['DRAFT', 'PUBLIC'] } }, required: ['status'] } })
    /**
     * Updates the status of a quiz for the authenticated teacher
     *
     * @param id The ID of the quiz to update
     * @param body The updated status of the quiz (DRAFT/PUBLIC)
     * @returns The updated quiz object
     */
    async updateQuizStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { status: 'DRAFT' | 'PUBLIC' },
        @Request() req
    ) {
        return this.quizService.updateQuizStatus(id, req.user.id, body.status);
    }

    @Post(':id/duplicate')
    @Roles(Role.TEACHER)
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
        return this.quizService.duplicateQuiz(id, req.user.id);
    }

    @Get('list/drafts')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Get draft quizzes' })

    /**
     * Retrieves all draft quizzes for the authenticated teacher
     *
     * @returns A list of draft quiz objects
     */
    async getDrafts(@Request() req) {
        return this.quizService.getDraftQuizzes(req.user.id);
    }

    @Get('list/public')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Get public quizzes' })

    /**
     * Retrieves all public quizzes for the authenticated teacher
     *
     * @returns A list of public quiz objects
     */
    async getPublic(@Request() req) {
        return this.quizService.getPublicQuizzes(req.user.id);
    }

    // Question Management Endpoints
    @Get('questions/all')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Get all questions for the authenticated teacher' })
    @ApiResponse({ status: 200, description: 'List of questions retrieved successfully' })
    /**
     * Retrieves all questions for the authenticated teacher
     *
     * @returns List of questions
     */
    async getQuestions(@Request() req) {
        return this.quizService.getQuestions(req.user.id);
    }

    @Get('question/:id')
    @Roles(Role.TEACHER)
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
        return this.quizService.getQuestion(id, req.user.id);
    }

    @Post(':quizId/questions')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Add a manual question to a quiz' })
    @ApiParam({ name: 'quizId', description: 'Quiz ID' })
    @ApiBody({ type: CreateQuestionDto })
    @ApiResponse({ status: 201, description: 'Question added to quiz successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    /**
     * Adds a manual question to a quiz for the authenticated teacher
     *
     * @param quizId The ID of the quiz to add the question to
     * @param createQuestionDto The question data to create
     * @returns The created question
     */
    async addManualQuestionToQuiz(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Body() createQuestionDto: CreateQuestionDto,
        @Request() req
    ) {
        return this.quizService.addManualQuestionToQuiz(req.user.id, quizId, createQuestionDto);
    }

    @Post(':quizId/questions/:questionId')
    @Roles(Role.TEACHER)
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

    @Post(':quizId/questions/ai')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Add AI-generated questions to a quiz' })
    @ApiParam({ name: 'quizId', description: 'Quiz ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                questions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/CreateQuestionDto' }
                }
            },
            required: ['questions']
        }
    })
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
        @Body() body: { noOfQuestions: number },
        @Request() req
    ) {
        return this.quizService.addAiQuestionsToQuiz(req.user.id, quizId, body.noOfQuestions);
    }

    @Post('questions/:id/duplicate')
    @Roles(Role.TEACHER)
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
        return this.quizService.duplicateQuestion(req.user.id, id);
    }

    @Put('questions/:id')
    @Roles(Role.TEACHER)
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
        return this.quizService.updateQuestion(req.user.id, id, updateQuestionDto);
    }

    @Delete('questions/:id/remove-from-quiz')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Remove a question from its quiz' })
    @ApiParam({ name: 'id', description: 'Question ID' })
    @ApiResponse({ status: 200, description: 'Question removed from quiz successfully' })
    @ApiResponse({ status: 404, description: 'Question not found' })
    /**
     * Removes a question from its quiz for the authenticated teacher
     *
     * @param id The ID of the question to remove from its quiz
     * @returns The removed question
     */
    async removeQuestionFromQuiz(@Param('id', ParseIntPipe) id: number, @Request() req, @Query('quizId') quizId: number) {
        return this.quizService.removeQuestionFromQuiz(req.user.id, id, quizId);
    }

    @Delete('questions/:id')
    @Roles(Role.TEACHER)
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
        return this.quizService.deleteQuestion(req.user.id, id);
    }

    // Quiz Attempt Endpoints
    @Get(':id/attempts/my')
    @Roles(Role.STUDENT)
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
        return this.quizService.getMyQuizAttempts(req.user.id, id);
    }

    @Get(':id/attempts')
    @Roles(Role.TEACHER)
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
        return this.quizService.getQuizAttempts(id, req.user.id);
    }

    @Post(':id/start')
    @Roles(Role.STUDENT)
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
        return this.quizService.startQuizAttempt(req.user.id, id);
    }

    @Post('attempts/:quizAttemptId/finish')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Finish a quiz attempt and receive results' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiResponse({ status: 200, description: 'Attempt finished and scored' })
    /**
     * Finishes a quiz attempt and receives the results for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to finish
     * @returns The finished quiz attempt and its results
     */
    async finishAttempt(
        @Param('quizAttemptId', ParseIntPipe) quizAttemptId: number,
        @Request() req
    ) {
        return this.quizService.finishQuizAttempt(req.user.id, quizAttemptId);
    }

    @Post('attempts/:quizAttemptId/answers')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Add an answer to a quiz attempt' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                questionId: { type: 'number' },
                answer: { type: 'string' }
            },
            required: ['questionId', 'answer']
        }
    })
    @ApiResponse({ status: 201, description: 'Answer added successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    /**
     * Adds an answer to a quiz attempt for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to add the answer to
     * @param body The answer data, containing the question ID and the answer text
     * @returns The added answer
     */
    async addQuestionAnswer(
        @Param('quizAttemptId', ParseIntPipe) quizAttemptId: number,
        @Body() body: { questionId: number; answer: string }
    ) {
        return this.quizService.addQuestionAnswer(quizAttemptId, body.questionId, body.answer);
    }

    @Put('attempts/:quizAttemptId/answers')
    @Roles(Role.STUDENT)
    @ApiOperation({ summary: 'Update an answer in a quiz attempt' })
    @ApiParam({ name: 'quizAttemptId', description: 'Quiz Attempt ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                questionId: { type: 'number' },
                answer: { type: 'string' }
            },
            required: ['questionId', 'answer']
        }
    })
    @ApiResponse({ status: 200, description: 'Answer updated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data or quiz not editable' })
    /**
     * Updates an answer in a quiz attempt for the authenticated student
     *
     * @param quizAttemptId The ID of the quiz attempt to update the answer in
     * @param body The answer data, containing the question ID and the answer text
     * @returns The updated answer
     */
    async updateQuestionAnswer(
        @Param('quizAttemptId', ParseIntPipe) quizAttemptId: number,
        @Body() body: { questionId: number; answer: string }
    ) {
        return this.quizService.updateQuestionAnswer(quizAttemptId, body.questionId, body.answer);
    }

    @Post(':quizId/questions/ai/save')
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: 'Save AI-generated questions (from Flutter) to DB' })
    @ApiParam({ name: 'quizId', description: 'Quiz ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                questions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/CreateQuestionDto' }
                }
            },
            required: ['questions']
        }
    })
    async saveAiQuestions(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Body() body: { questions: CreateQuestionDto[] },
        @Request() req
    ) {
        return this.quizService.saveAiQuestions(req.user.id, quizId, body.questions);
    }


    @Post(':quizId/ai-generate')
    @Roles(Role.TEACHER)
    async generateAiQuestions(
        @Param('quizId', ParseIntPipe) quizId: number,
        @Req() req: any,
    ) {
        return this.quizService.generateAiQuestions(quizId, +req.user.id);
    }

}
