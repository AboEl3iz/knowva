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
        example: [
            [
                {
                    "id": 1,
                    "title": "calculate this equition 4*4 = ?",
                    "groupId": 5,
                    "studentId": 7,
                    "createdAt": "2025-09-21T13:32:16.950Z"
                }
            ]
        ]
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
        example: {
            "id": 1,
            "title": "calculate this equition 4*4 = ?",
            "groupId": 5,
            "studentId": 7,
            "createdAt": "2025-09-21T13:32:16.950Z",
            "messages": [
                {
                    "id": 1,
                    "text": "calculate this equition 4*4 = ?",
                    "sessionId": 1,
                    "aiGenerated": false,
                    "createdAt": "2025-09-21T14:44:29.992Z"
                },
                {
                    "id": 2,
                    "text": "4 * 4 = 16\n",
                    "sessionId": 1,
                    "aiGenerated": true,
                    "createdAt": "2025-09-21T14:44:29.992Z"
                },
                {
                    "id": 3,
                    "text": "calculate this equition 4*8 = ?",
                    "sessionId": 1,
                    "aiGenerated": false,
                    "createdAt": "2025-09-21T14:50:51.134Z"
                },
                {
                    "id": 4,
                    "text": "4 * 8 = 32\n",
                    "sessionId": 1,
                    "aiGenerated": true,
                    "createdAt": "2025-09-21T14:50:51.134Z"
                },
                {
                    "id": 5,
                    "text": "calculate this equition 4*9 = ?",
                    "sessionId": 1,
                    "aiGenerated": false,
                    "createdAt": "2025-09-21T14:54:13.249Z"
                },
                {
                    "id": 6,
                    "text": "4 * 9 = 36\n",
                    "sessionId": 1,
                    "aiGenerated": true,
                    "createdAt": "2025-09-21T14:54:13.249Z"
                }
            ]
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Chatbot not found' })
    async getChatbot(@Req() req, @Param('sessionId') sessionId: number) {
        return await this.ChatbotService.getChatbot(sessionId, req.user.id);
    }

    @Post('create/:groupId')
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
        return await this.ChatbotService.createChatbotSession(+req.user.id, groupId);
    }

    @Post('message/:sessionId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Send message' })
    @ApiParam({ name: 'sessionId', type: 'number', required: true, description: 'Chatbot session id' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                text: { type: 'string', example: 'Hello, how are you?' }
            },
            required: ['text']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Send message',
        type: SendMessageResponseDto
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Chatbot session not found' })
    @ApiResponse({ status: 400, description: 'Failed to send message' })
    async sendMessage(@Req() req, @Param('sessionId') sessionId: string, @Body() message: { text: string }) {
        return await this.ChatbotService.sendMessage(+req.user.id, message.text, +sessionId);
    }
}