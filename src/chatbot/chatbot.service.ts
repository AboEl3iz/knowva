import { BadRequestException } from "@nestjs/common";
import axios from "axios";
import { PrismaService } from "src/database/prisma.service";

export class ChatbotService {
    constructor(private prisma: PrismaService) { }

    async getChatbots(userId: number) {
        return await this.prisma.chatbotSession.findMany({ where: { studentId: userId } });
    }

    async getChatbot(id: number, userId: number) {
        return await this.prisma.chatbotSession.findUnique({ where: { id, studentId: userId }, include: { messages: true } });
    }

    async createChatbotSession(userId: number, groupId: number) {
        const membership = await this.prisma.membership.findFirst({ where: { groupId, studentId: userId } });
        if (!membership) {
            throw new BadRequestException('User is not a member of the group');
        }

        return await this.prisma.chatbotSession.create({ data: { studentId: userId, groupId } });
    }

    async sendMessage(userId: number, message: string, sessionId: number) {
        const session = await this.prisma.chatbotSession.findUnique({ where: { id: sessionId, studentId: userId } });
        if (!session) {
            throw new BadRequestException('Session not found');
        }

        message = message.trim();

        let response;
        try {
            response = await axios.post('https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/chatbot/ask', {
                group_id: session.groupId,
                user_query: message,
                student_id: userId,
                session_id: sessionId
            });
        } catch (e) {
            throw new BadRequestException('Failed to send message');
        }

        const answer = response.data.response.answer;

        await this.prisma.chatbotMessage.createMany({ data: [{ sessionId: sessionId, text: message, aiGenerated: false }, { sessionId: sessionId, text: answer, aiGenerated: true }] });

        return { answer };
    }
}