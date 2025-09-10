import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { PrismaService } from 'src/database/prisma.service';
import { NotificationController } from './notification.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  providers: [NotificationGateway, NotificationService, PrismaService],
  exports: [NotificationService, NotificationGateway,
    
  ],
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
  ],
  controllers: [NotificationController],
})
export class NotificationModule { }
