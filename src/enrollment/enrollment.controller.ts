import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Enrollment } from './entities/enrollment.entity';

@ApiTags('enrollment')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create enrollment by invite token for the current student' })
  @ApiQuery({ name: 'token', type: String, required: true, description: 'Invite token for the group', example: 'inv_ABC123' })
  @ApiOkResponse({
    description: 'Enrollment created successfully',
    schema: {
      example: {
        id: 1,
        status: 'APPROVED',
        studentId: 2,
        groupId: 1,
        student: {
          id: 2,
          name: 'student1',
          email: 'student1@gmail.com'
        }
      }
    }
  })
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
  @ApiOperation({ summary: 'Get all enrollments for a specific group (teacher only)' })
  @ApiParam({ name: 'groupId', type: Number, description: 'Group ID', example: 42 })
  @ApiOkResponse({
    description: 'List of enrollments for the group',
    schema: {
      type: 'array',
      items: {
        example: {
          id: 1,
          status: 'APPROVED',
          studentId: 2,
          groupId: 1,
          student: {
            id: 2,
            name: 'student1',
            email: 'student1@gmail.com'
          }
        }
      }
    }
  })
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
  @ApiOperation({ summary: 'Get all enrollments for the current student' })
  @ApiOkResponse({
    description: 'List of enrollments for the student',
    schema: {
      type: 'array',
      items: {
        example: {
          id: 1,
          status: 'APPROVED',
          studentId: 2,
          groupId: 1,
          student: {
            id: 2,
            name: 'student1',
            email: 'student1@gmail.com'
          }
        }
      }
    }
  })
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
  @ApiOperation({ summary: 'Accept a pending enrollment (teacher only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Enrollment ID', example: 123 })
  @ApiOkResponse({
    description: 'Enrollment accepted',
    schema: {
      example: {
        id: 1,
        status: 'APPROVED',
        studentId: 2,
        groupId: 1,
        student: {
          id: 2,
          name: 'student1',
          email: 'student1@gmail.com'
        }
      }
    }
  })
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
  @ApiOperation({ summary: 'Reject a pending enrollment (teacher only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Enrollment ID', example: 124 })
  @ApiOkResponse({
    description: 'Enrollment rejected',
    schema: {
      example: {
        id: 1,
        status: 'REJECTED',
        studentId: 2,
        groupId: 1,
        student: {
          id: 2,
          name: 'student1',
          email: 'student1@gmail.com'
        }
      }
    }
  })
  updateStatusreject(@Param('id') id: string) {
    return this.enrollmentService.reject(+id);
  }
}
