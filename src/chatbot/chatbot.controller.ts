import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ChatbotService } from "./chatbot.service";
import { AuthorizationGuard } from "src/guards/authorization.guard";
import { AuthenticationGuard } from "src/guards/authentication.guard";
import { Roles } from "src/decorator/decorator/roles.decorator";
import { Role } from "src/decorator/enums/roles";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import {
    ChatbotResponseDto,
    ChatbotWithMessagesResponseDto,
    SendMessageResponseDto
} from "./dto/responses.dto";
@ApiBearerAuth()
@Controller('chatbot')
export class ChatbotController {
    constructor(private ChatbotService: ChatbotService) { }

    @Get()
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get all chatbots' })
    @ApiResponse({
        status: 200,
        description: 'Get all chatbots',
        type: [ChatbotResponseDto]
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getChatbots(@Req() req) {
        return await this.ChatbotService.getChatbots(req.user.id);
    }

    @Get('/:sessionId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get chatbot' })
    @ApiParam({ name: 'sessionId', type: 'number', required: true, description: 'Chatbot session id' })
    @ApiResponse({
        status: 200,
        description: 'Get chatbot',
        type: ChatbotWithMessagesResponseDto
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Chatbot not found' })
    async getChatbot(@Req() req, @Param('sessionId') sessionId: number) {
        return await this.ChatbotService.getChatbot(sessionId, req.user.id);
    }

    @Post('/:groupId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Create chatbot session' })
    @ApiParam({ name: 'groupId', type: 'number', required: true, description: 'Group id' })
    @ApiResponse({
        status: 200,
        description: 'Create chatbot session',
        type: ChatbotResponseDto
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    async createChatbotSession(@Req() req, @Param('groupId') groupId: number) {
        return await this.ChatbotService.createChatbotSession(req.user.id, groupId);
    }

    @Post('/:sessionId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Send message' })
    @ApiParam({ name: 'sessionId', type: 'number', required: true, description: 'Chatbot session id' })
    @ApiBody({ description: 'Message', type: String, required: true })
    @ApiResponse({
        status: 200,
        description: 'Send message',
        type: SendMessageResponseDto
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Chatbot session not found' })
    @ApiResponse({ status: 400, description: 'Failed to send message' })
    async sendMessage(@Req() req, @Param('sessionId') sessionId: number, @Body() message: string) {
        return await this.ChatbotService.sendMessage(req.user.id, message, sessionId);
    }
}