import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { ParseIntPipe } from '@nestjs/common';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  // /analysis/students/:id/analysis
  @Get('students/:id/analysis')
  /**
   * Retrieves analysis data for a given student
   * @param id The ID of the student to retrieve analysis data for
   * @returns Analysis data for the given student
   */
  getStudentAnalysis(@Param('id', ParseIntPipe) id: number) {
    return this.analysisService.getStudentAnalysis(id);
  }

  // /analysis/groups/:id/analysis
  @Get('groups/:id/analysis')
  /**
   * Retrieves analysis data for a given group
   * @param id The ID of the group to retrieve analysis data for
   * @param passing The passing threshold (optional, defaults to 50) for the group's exams
   * @returns Analysis data for the given group
   */
  getGroupAnalysis(@Param('id', ParseIntPipe) id: number, @Query('passing') passing?: string) {
    const passingThreshold = passing ? parseFloat(passing) : 50;
    return this.analysisService.getGroupAnalysis(id, passingThreshold);
  }

  // /analysis/exams/:id/analysis
  @Get('exams/:id/analysis')
  /**
   * Retrieves analysis data for a given exam
   * @param id The ID of the exam to retrieve analysis data for
   * @param passing The passing threshold (optional, defaults to 50) for the exam
   * @returns Analysis data for the given exam
   */
  getExamAnalysis(@Param('id', ParseIntPipe) id: number, @Query('passing') passing?: string) {
    const passingThreshold = passing ? parseFloat(passing) : 50;
    return this.analysisService.getExamAnalysis(id, passingThreshold);
  }

  @Get('stats')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async getStats(@Req() req) {
    const teacherId = req.user.id; // جاي من الـ JWT
    return this.analysisService.getStats(+teacherId);
  }
}
