import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ChatbotService } from "./chatbot.service";
import { AuthorizationGuard } from "src/guards/authorization.guard";
import { AuthenticationGuard } from "src/guards/authentication.guard";
import { Roles } from "src/decorator/decorator/roles.decorator";
import { Role } from "src/decorator/enums/roles";

@Controller('chatbot')
export class ChatbotController {
    constructor(private ChatbotService: ChatbotService) { }

    @Get()
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    async getChatbots(@Req() req) {
        return this.ChatbotService.getChatbots(req.user.id);
    }

    @Get('/:sessionId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    async getChatbot(@Req() req, @Param('sessionId') sessionId: number) {
        return this.ChatbotService.getChatbot(sessionId, req.user.id);
    }

    @Post('/:groupId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    async createChatbotSession(@Req() req, @Param('groupId') groupId: number) {
        return this.ChatbotService.createChatbotSession(req.user.id, groupId);
    }

    @Post('/:sessionId')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    async sendMessage(@Req() req, @Param('sessionId') sessionId: number, @Body() message: string) {
        return this.ChatbotService.sendMessage(req.user.id, message, sessionId);
    }
}