import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) { }

  @Post('create/:subjectId')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
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
  /**
   * Retrieves all groups for the given subject id
   * @param subjectId the id of the subject to find groups for
   * @returns an array of group objects
   */
  findAllBySubject(@Param('subjectId') subjectId: string) {
    return this.groupService.findAllBySubject(+subjectId);
  }

  @Get('all-by-teacher/:teacherId')
  /**
   * Retrieves all groups for the given teacher id
   * @param teacherId the id of the teacher to find groups for
   * @returns an array of group objects
   */
  findAllByTeacher(@Param('teacherId') teacherId: string) {
    return this.groupService.findAllByTeacher(+teacherId);
  }

  @Get('details/:id')
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
  /**
   * Marks a group as complete by its id
   * @param id the id of the group to mark as complete
   * @param req the express request object
   * @returns a message indicating the group was marked as completed successfully
   */
  complete(@Param('id') id: string, @Req() req: any) {
    return this.groupService.toggleGroupStatus(+id, +req.user.id);
  }

}
