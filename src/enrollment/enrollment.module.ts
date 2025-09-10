import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { PrismaService } from 'src/database/prisma.service';
import { NotificationModule } from 'src/notification/notification.module';
import { GroupModule } from 'src/group/group.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentService , PrismaService],
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
        global: true,
      }),
      inject: [ConfigService],
    }),
    NotificationModule,
    GroupModule
  ],
})
export class EnrollmentModule { }
