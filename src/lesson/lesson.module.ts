import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { PrismaService } from 'src/database/prisma.service';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { NotificationModule } from 'src/notification/notification.module';
@Module({
  controllers: [LessonController],
  providers: [LessonService, PrismaService],
  imports: [AuthModule, CloudinaryModule , NotificationModule],
})
export class LessonModule { }
