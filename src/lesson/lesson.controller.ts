import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import * as multer from 'multer';
import { diskStorage, memoryStorage } from 'multer';

import { FileInterceptor } from '@nestjs/platform-express'
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';
@Controller('lesson')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post('create')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  @UseInterceptors(
    FileInterceptor('file'  , {
      storage: memoryStorage(),

      fileFilter: (req, file, cb) => {
        if (!file) {
          return cb(new BadRequestException('File is required'), false);
        }
        cb(null, true);
      }
    }),
  )
  
  /**
   * Creates a new lesson in the given groups and subject for the current user
   * @param file The file to upload to the lesson
   * @param subjectId The id of the subject that this lesson belongs to
   * @param groupIds Comma-separated list of group IDs that this lesson belongs to
   * @param CreateLessonDto The lesson data to create
   * @returns The created lesson object
   */
  create(@UploadedFile() file: Express.Multer.File, @Query('subjectId') subjectId: string ,@Query('groupIds') groupIds: string,@Body() CreateLessonDto : CreateLessonDto , @Req() req: any) {

    const groupIdArray = groupIds.split(',').map(id => +id.trim()).filter(id => !isNaN(id));
    return this.lessonService.create(file , CreateLessonDto , +subjectId , groupIdArray , +req.user.id);
  }

  @Get('for-subject/:subjectId')
  /**
   * Retrieves all lessons for the given subject id
   * @param subjectId the id of the subject to find lessons for
   * @returns an array of lesson objects
   */
  findAllForSubject(@Param('subjectId', ParseIntPipe) subjectId: number) {
    return this.lessonService.findAllForSubject(subjectId);
  }

  @Get('for-teacher/:teacherId')
  /**
   * Retrieves all lessons for the given subject id
   * @param subjectId the id of the subject to find lessons for
   * @returns an array of lesson objects
   */
  findAllForteacher(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return this.lessonService.getalllessonsforteacher(teacherId);
  }

  @Get(':id')
  /**
   * Retrieves a single lesson by its id
   * @param id the id of the lesson to retrieve
   * @returns the lesson object
   */
  findOne(@Param('id') id: string) {
    return this.lessonService.findOne(+id);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Deletes a lesson by its id
   * @param id the id of the lesson to delete
   * @returns a message indicating the lesson was deleted successfully
   */
  remove(@Param('id') id: string) {
    return this.lessonService.remove(+id);
  }

  // @Post('add-to-any-group')
  // @Roles(Role.TEACHER)
  // @UseGuards(AuthenticationGuard,AuthorizationGuard)
  // @UseInterceptors(
  //   FileInterceptor('file'  , {
  //     storage: memoryStorage(),

  //     fileFilter: (req, file, cb) => {
  //       if (!file) {
  //         return cb(new BadRequestException('File is required'), false);
  //       }
  //       cb(null, true);
  //     }
  //   }),
  // )
  // /**
  //  * Adds a lesson to any groups (not necessarily owned by the teacher)
  //  * @param file The file to upload to the lesson
  //  * @param subjectId The id of the subject that this lesson belongs to
  //  * @param groupIds Comma-separated list of group IDs that this lesson belongs to
  //  * @param CreateLessonDto The lesson data to create
  //  * @returns The created lesson object
  //  */
  // addLessonToAnyGroup(@UploadedFile() file: Express.Multer.File, @Query('subjectId') subjectId: string ,@Query('groupIds') groupIds: string,@Body() CreateLessonDto : CreateLessonDto , @Req() req: any) {
  //   const groupIdArray = groupIds.split(',').map(id => +id.trim()).filter(id => !isNaN(id));
  //   return this.lessonService.addLessonToAnyGroup(file , CreateLessonDto , +subjectId , groupIdArray , req.user.id);
  // }

  @Get('for-group/:groupId')
  /**
   * Retrieves all lessons for the given group id
   * @param groupId the id of the group to find lessons for
   * @returns an array of lesson objects
   */
  getLessonsForGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.lessonService.getLessonsForGroup(groupId);
  }

  @Post(':lessonId/add-to-groups')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Adds an existing lesson to additional groups
   * @param lessonId The id of the lesson to add to groups
   * @param groupIds Comma-separated list of group IDs to add the lesson to
   * @returns The updated lesson object
   */
  addLessonToGroups(@Param('lessonId', ParseIntPipe) lessonId: number, @Query('groupIds') groupIds: string, @Req() req: any) {
    const groupIdArray = groupIds.split(',').map(id => +id.trim()).filter(id => !isNaN(id));
    return this.lessonService.addLessonToGroups(lessonId, groupIdArray, req.user.id);
  }

  @Delete(':lessonId/remove-from-groups')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard,AuthorizationGuard)
  /**
   * Removes an existing lesson from specified groups
   * @param lessonId The id of the lesson to remove from groups
   * @param groupIds Comma-separated list of group IDs to remove the lesson from
   * @returns The updated lesson object
   */
  removeLessonFromGroups(@Param('lessonId', ParseIntPipe) lessonId: number, @Query('groupIds') groupIds: string, @Req() req: any) {
    const groupIdArray = groupIds.split(',').map(id => +id.trim()).filter(id => !isNaN(id));
    return this.lessonService.removeLessonFromGroups(lessonId, groupIdArray, req.user.id);
  }
}
