import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('create')
  @Roles(Role.STUDENT)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Creates a new enrollment in the given group for the current user.
   * @param groupId the id of the group to add the enrollment to
   * @returns the created enrollment object
   */
  create(@Query('token') token: string , @Req () req: any) {
    return this.enrollmentService.createByToken(token, +req.user.id);
  }

  @Get('group/all/:groupId')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Gets all enrollments for a given group
   * @param groupId the id of the group to get enrollments for
   * @returns an array of enrollment objects
   */
  getallenmentsforgroup(@Param('groupId') groupId: string) {
    return this.enrollmentService.findAll(+groupId);
  }

  @Get('student/all')
  @Roles(Role.STUDENT)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Gets all enrollments for a given user
   * @param req the express request object
   * @returns an array of enrollment objects
   */
  getallenmentsforstudent(@Req() req: any) {
    return this.enrollmentService.findAllByUser(+req.user.id);
  }

  @Patch('accept/:id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Updates the status of a pending enrollment to accepted
   * @param id the id of the enrollment to update
   * @returns the updated enrollment object
   */
  updateStatusaccept(@Param('id') id: string ) {
    return this.enrollmentService.update(+id );
  }

  @Patch('reject/:id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Updates the status of a pending enrollment to rejected
   * @param id the id of the enrollment to update
   * @returns the updated enrollment object
   */
  updateStatusreject(@Param('id') id: string) {
    return this.enrollmentService.reject(+id);
  }
}
