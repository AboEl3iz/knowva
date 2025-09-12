import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { ParseIntPipe } from '@nestjs/common';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
@ApiTags('Analysis')
@ApiBearerAuth()
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) { }

  // /analysis/students/:id/analysis
  @Get('students/:id/analysis')
  @ApiOperation({ summary: 'Retrieves analysis data for a given student' })
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
  @ApiOperation({ summary: 'Retrieves analysis data for a given group' })
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
  @ApiOperation({ summary: 'Retrieves analysis data for a given exam' })
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
  @ApiOperation({ summary: 'Retrieves statistics for a teacher' })
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async getStats(@Req() req) {
    const teacherId = req.user.id; // جاي من الـ JWT
    return this.analysisService.getStats(+teacherId);
  }

  @Get('student/stats')
  @ApiOperation({ summary: 'Retrieves statistics for a student' })
  @ApiResponse({
    schema: {
      type: 'object',
      properties: {
        groups: { type: 'integer' },
        exams: { type: 'integer' },
        lessons: { type: 'integer' },
      },
    },
  })
  @Roles(Role.STUDENT)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async getStudentStats(@Req() req) {
    const studentid = req.user.id; // جاي من الـ JWT
    return this.analysisService.getStudentStats(+studentid);
  }

  @Get('student/stats/result')
  @ApiOperation({ summary: 'Retrieves all results for a student and his exams' })
  @ApiResponse({
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              quizId: { type: 'integer' },
              studentId: { type: 'integer' },
              score: { type: 'integer' },
              createdAt: { type: 'string', format: 'date-time' },
              startedAt: { type: 'string', format: 'date-time' },
              endedAt: { type: 'string', format: 'date-time' },
              quiz: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  title: { type: 'string' },
                  status: { type: 'string', enum: ['PUBLIC', 'DRAFT'] },
                  subjectId: { type: 'integer' },
                  groupId: { type: 'integer' },
                  createdById: { type: 'integer' },
                  startsAt: { type: 'string', format: 'date-time' },
                  endsAt: { type: 'string', format: 'date-time' },
                  durationMins: { type: 'integer' },
                  isActive: { type: 'boolean' },
                  language: { type: 'string' },
                },
              },
            },
          },
        },
        n_exams_oncoming: { type: 'integer' },
        n_exams_ended: { type: 'integer' },
        n_exams_onging: { type: 'integer' },
      },
    },
  })
  @Roles(Role.STUDENT)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  async getGroupStats(@Req() req) {
    const studentId = req.user.id; // جاي من الـ JWT
    return this.analysisService.getAllResults(+studentId);
  }

  @Get('next')
    @Roles(Role.STUDENT)
    @UseGuards(AuthenticationGuard, AuthorizationGuard)
    // @UseGuards(AuthenticationGuard, AuthorizationGuard)
    @ApiOperation({ summary: 'Get the next due quiz for the logged-in student' })
    @ApiResponse({ status: 200, description: 'Next quiz or null if none' })
    /**
     * Returns the ongoing quiz if any; otherwise the nearest upcoming published quiz
     * for the authenticated student based on group memberships.
     */
    async getNextDueQuiz(@Req() req : any) {
        console.log(Role.STUDENT, Role.TEACHER);

        return  this.analysisService.getNextDueQuiz(+req.user.id);
    }
}
