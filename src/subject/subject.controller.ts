import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Roles, ROLES_KEY } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';


@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService,


  ) { }

  @Post('create')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  /**
   * @description Create a new subject
   * @method create
   * @param createSubjectDto The subject data
   * @param req The request object
   * @returns The created subject object
   */
  create(@Body() createSubjectDto: CreateSubjectDto, @Req() req: any) {
    return this.subjectService.create(createSubjectDto, +req.user.id);
  }



  @Get('subject/:id')

  /**
   * @description Retrieve a single subject by its id
   * @method findOne
   * @param id The id of the subject to retrieve
   * @returns The subject object
   */
  findOne(@Param('id') id: string) {
    return this.subjectService.findOne(+id);
  }

  @Get('all-by-teacher')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard)
  /**
   * @description Retrieve all subjects
   * @method findall
   * @returns An array of subject objects
   */
  findallforteacher(@Req () req: any) {
    return this.subjectService.findallforteacher(+req.user.id);
  }

  @Get('all')
  findall(){
    return this.subjectService.findall();
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  /**
   * @description Update a single subject by its id
   * @method update
   * @param id The id of the subject to update
   * @param updateSubjectDto The subject data to update
   * @param req The request object
   * @returns The updated subject object
   */
  update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto , @Req() req: any) {
    return this.subjectService.update(+id, updateSubjectDto , +req.user.id);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  /**
   * @description Delete a subject by its id
   * @method remove
   * @param id The id of the subject to delete
   * @param req The request object
   * @returns A message indicating the subject was deleted successfully
   */
  remove(@Param('id') id: string , @Req() req: any) {
    return this.subjectService.remove(+id, +req.user.id);
  }
}
