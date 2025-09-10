import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaService } from 'src/database/prisma.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
    controllers: [QuizController],
    providers: [QuizService, PrismaService],
    imports: [AuthModule, NotificationModule]
})
export class QuizModule { }
