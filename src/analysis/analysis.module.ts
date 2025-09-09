import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { PrismaService } from 'src/database/prisma.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, PrismaService],
  imports: [AuthModule],
})
export class AnalysisModule {}
