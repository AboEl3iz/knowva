import { PrismaService } from "src/database/prisma.service";
import { ChatbotController } from "./chatbot.controller";
import { ChatbotService } from "./chatbot.service";
import { AuthModule } from "src/auth/auth.module";
import { Module } from "@nestjs/common";

@Module({
    controllers: [ChatbotController],
    providers: [ChatbotService, PrismaService],
    imports: [AuthModule],
})
export class ChatbotModule { }