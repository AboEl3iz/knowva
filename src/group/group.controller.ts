import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiParam, ApiSchema, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GroupResponseDto } from './dto/group-response.dto';

@Controller('group')
@ApiTags('Group')
@ApiBearerAuth()
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @Post('create/:subjectId')
  @ApiOperation({ summary: 'Create a new group' })
  
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @ApiBody({ description: 'The group data', schema:{
    example: {
      name: 'Math 101 Group',
      capacity: 30
    }
  }})
  @ApiOkResponse({
    description: 'The created group object',
    type: GroupResponseDto,
    example: {
      id: '1',
      name: 'Math 101 Group',
      capacity: 30,
      subjectId: 1,
      status: 'active',
      createdAt: '2025-09-12T10:00:00.000Z',
      token : '1234'
    }
  })
  @ApiParam({ name: 'subjectId', type: 'number', description: 'The id of the subject that this group belongs to' })
  // @ApiBody({ description: 'The group data', type: CreateGroupDto })
  /**
   * Creates a new group
   * @param subjectId The id of the subject that this group belongs to
   * @param createGroupDto The group data
   * @returns The created group object
   */
  create(@Param('subjectId') subjectId: string, @Body() createGroupDto: CreateGroupDto, @Req() req: any) {
    return this.groupService.create(createGroupDto, +subjectId, +req.user.id);
  }

  @Get('all/:subjectId')
  @ApiOperation({ summary: 'Get all groups for a subject' })
  /**
   * Retrieves all groups for the given subject id
   * @param subjectId the id of the subject to find groups for
   * @returns an array of group objects
   */
  findAllBySubject(@Param('subjectId') subjectId: string) {
    return this.groupService.findAllBySubject(+subjectId);
  }

  @Get('all-by-teacher/:teacherId')
  @ApiOperation({ summary: 'Get all groups for a teacher' })
  /**
   * Retrieves all groups for the given teacher id
   * @param teacherId the id of the teacher to find groups for
   * @returns an array of group objects
   */
  findAllByTeacher(@Param('teacherId') teacherId: string) {
    return this.groupService.findAllByTeacher(+teacherId);
  }

  @Get('details/:id')
  @ApiOperation({ summary: 'Get details of a group' })
  /**
   * Retrieves a single group by its id
   * @param id the id of the group to retrieve
   * @returns the group object
   */
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @ApiOperation({ summary: 'Update a group' })
  /**
   * Updates a single group by its id
   * @param id the id of the group to update
   * @param updateGroupDto the group data to update
   * @param req the express request object
   * @returns the updated group object
   */
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto, @Req() req: any) {
    return this.groupService.update(+id, updateGroupDto, +req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)

  /**
   * Deletes a group by its id
   * @param id the id of the group to delete
   * @param req the express request object
   * @returns a message indicating the group was deleted successfully
   */
  remove(@Param('id') id: string, @Req() req: any) {
    return this.groupService.remove(+id, +req.user.id);
  }

  @Patch('complete/:id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @ApiOperation({ summary: 'Mark a group as complete' })
   @ApiOkResponse({
   
    type: GroupResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  /**
   * Marks a group as complete by its id
   * @param id the id of the group to mark as complete
   * @param req the express request object
   * @returns a message indicating the group was marked as completed successfully
   */
  complete(@Param('id') id: string, @Req() req: any) {
    return this.groupService.toggleGroupStatus(+id, +req.user.id);
  }
@Get('student/groups')
  @ApiOperation({ summary: 'Get all groups for a student' })
  @Roles(Role.STUDENT)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @ApiOkResponse({
    description: 'A list of groups the student is a member of.',
    type: GroupResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  findAllByStudent(@Req() req: any) {
    return this.groupService.findAllByStudent(req.user.id);
  }
}
