import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import axios from "axios";
import { group } from "console";
import { PrismaService } from "src/database/prisma.service";
@Injectable()
export class ChatbotService {
    constructor(private readonly prisma: PrismaService) { }

    async getChatbots(userId: number) {
        return await this.prisma.chatbotSession.findMany({ where: { studentId: userId } });
    }

    async getChatbot(id: number, userId: number) {
        return await this.prisma.chatbotSession.findUnique({ where: { id, studentId: userId }, include: { messages: true } });
    }

    async createChatbotSession(userId: number, groupId: number) {
        const membership = await this.prisma.membership.findFirst({ where: { studentId: userId, groupId } });
        if (!membership) {
            throw new BadRequestException('User is not a member of the group');
        }

        /**
         * 1. check if the group has a lesson 
         * 2. if not, throw an error
         * 3. if yes, create a new chatbot session && upload this lesson for ai model
         * 4. return the session
         */
        // const lessons = await this.prisma.lesson.findMany({
        //     where: {
        //         groups: {
        //             some: {
        //                 id: groupId,
        //                 group: {
        //                     memberships: { some: { studentId: userId, status: 'APPROVED' } }
        //                 }
        //             }
        //         }
        //     }
        // });

        // if (!lessons.length) {
        //     throw new NotFoundException('Group has no lessons');
        // }

        // for (const lesson of lessons) {
        //     const aiPayload = {
        //         group_id: groupId.toString(),
        //         pdf_path: lesson.url
        //     };

        //     try {
        //         Logger.debug(`Uploading lesson to AI model: ${JSON.stringify(aiPayload)}`);
        //         const response = await axios.post(
        //             'https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/embedding/upload-document',
        //             aiPayload,
        //             { headers: { 'Content-Type': 'application/json' } }
        //         );
        //         Logger.debug(`AI model upload response: ${JSON.stringify(response.data)}`);
        //     } catch (e) {
        //         throw new BadRequestException(`Failed to upload lesson to AI model: ${e.message}`);
        //     }
        // }

        let session = await this.prisma.chatbotSession.create({ data: { studentId: userId, groupId } });
        return session;
    }

    async sendMessage(userId: number, message: string, sessionId: number) {
        const session = await this.prisma.chatbotSession.findFirst({
            where: { id: sessionId, studentId: userId },
            include: { messages: true, group: true }
        })
        if (!session) {
            throw new BadRequestException('Session not found');
        }
        Logger.debug(`Sending message to chatbot: ${message} for session ${sessionId} and group ${session.groupId}`);

        let requestPayload = {
            group_id: session.groupId.toString(),
            user_query: message,
            student_id: userId.toString(),
            session_id: session.id.toString()
        };



        let response;
        try {
            Logger.debug(`Request payload: ${JSON.stringify(requestPayload)}`);

            response = await axios.post('https://8080-01k4nxc27xwgyn4vsge9kda40b.cloudspaces.litng.ai/ai/chatbot/ask', requestPayload, { headers: { 'Content-Type': 'application/json' } });
            Logger.debug(`Chatbot response: ${JSON.stringify(response.data)}`);
        } catch (e) {
            throw new BadRequestException(`Failed to send message to chatbot: ${e.message}`);
        }

        const answer = response.data.response.answer;

        await this.prisma.chatbotMessage.createMany({ data: [{ sessionId: sessionId, text: message, aiGenerated: false }, { sessionId: sessionId, text: answer, aiGenerated: true }] });

        if (session.messages.length < 1) {
            await this.prisma.chatbotSession.update({ where: { id: session.id }, data: { title: message } });
        }

        return { answer };
    }
}