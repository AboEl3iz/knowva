import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { PrismaService } from 'src/database/prisma.service';
import { Lesson, LessonType } from '@prisma/client';
import { unlink } from 'fs';
import { IMaterial } from 'src/helper/interfaces/interfaces.response';
import { matrialType } from 'src/decorator/enums/roles';

@Injectable()
export class LessonService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService
  ) { }
  
  async create(file: Express.Multer.File, CreateLessonDto: CreateLessonDto, subjectId: number, groupIds: number[], userId: number): Promise<Lesson> {

    if (!subjectId) {
      throw new BadRequestException('subjectId is required');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!groupIds || groupIds.length === 0) {
      throw new BadRequestException('At least one groupId is required');
    }
    
    let subject = await this.prisma.subject.findUnique({
      where: {
        id: subjectId,
        teacherId: userId
      }
    });
    if (!subject) {
      throw new BadRequestException('Subject not found or not owned by teacher');
    }
    
    // Verify all groups exist
    let groups = await this.prisma.group.findMany({
      where: {
        id: { in: groupIds }
      }
    });
    if (groups.length !== groupIds.length) {
      throw new BadRequestException("One or more groups not found");
    }

    const {secure_url , downloadUrl ,public_id} = await this.cloudinaryService.uploadFile(file).catch((err) => {
      console.log(err);
      throw new BadRequestException('Error uploading file');
    });

    let type: string;
    switch (file.mimetype) {
      case 'video/mp4':
        type = matrialType.video as string;
        break;
      case 'application/pdf':
        type = matrialType.pdf as string;
        break;
      default:
        type = matrialType.document as string;
    }

    let lesson = await this.prisma.lesson.create({
      data: {
        createdById : userId,
        title: CreateLessonDto.title,
        description : CreateLessonDto.description,
        url:  file.mimetype === 'application/pdf' ? downloadUrl : secure_url,
        type: type,
        subjectId: subjectId,
        publicId: public_id,

      }
    });

    // Create lesson-group relationships
    await this.prisma.lessonGroup.createMany({
      data: groupIds.map(groupId => ({
        lessonId: lesson.id,
        groupId: groupId
      }))
    });

    // Return lesson with groups
    let lessonWithGroups = await this.prisma.lesson.findUnique({
      where: { id: lesson.id },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    return lessonWithGroups!;
  }

  async findAllForSubject(subjectId: number): Promise<IMaterial[]> {

    let lessons = await this.prisma.lesson.findMany({
      where: {
        subjectId: subjectId
      },
      include: {
        subject: {
          select: {
            title: true,
            description: true,
            teacher: { select: { name: true, email: true, id: true } }
          }
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    return lessons.map((lesson) => ({
      id: lesson.id.toString(),
      name: lesson.subject.title,
      fileUrl: lesson.url,
      type: lesson.type,
      subjectId: lesson.subjectId.toString(),
      description: lesson.title,
      createdAt: lesson.createdAt,
      createdBy: {
        id: lesson.subject.teacher.id.toString(),
        name: lesson.subject.teacher.name,
        email: lesson.subject.teacher.email,
      },
      groups: lesson.groups.map(lg => ({
        id: lg.group.id.toString(),
        name: lg.group.name
      }))
    }));
  }

  async findOne(id: number): Promise<IMaterial> {
    let lesson = await this.prisma.lesson.findUnique({
      where: {
        id: id
      },
      include: {
        subject: {
          select: {
            title: true,
            description: true,
            teacher: { select: { name: true, email: true, id: true } }
          }
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }
    return {
      id: lesson.id.toString(),
      name: lesson.title,
      fileUrl: lesson.url,
      type: lesson.type,
      subjectId: lesson.subjectId.toString(),
      description: lesson.description,
      createdAt: lesson.createdAt,
      createdBy: {
        id: lesson.subject.teacher.id.toString(),
        name: lesson.subject.teacher.name,
        email: lesson.subject.teacher.email,
      },
      groups: lesson.groups.map(lg => ({
        id: lg.group.id.toString(),
        name: lg.group.name
      }))
    };
  }


  async getalllessonsforteacher(teacherId: number): Promise<IMaterial[]> {
    let lessons = await this.prisma.lesson.findMany({
      where: {
        subject: {
          teacherId: teacherId
        },
      },
      include: {
        subject: {
          select: {
            title: true,
            description: true,
            teacher: { select: { name: true, email: true, id: true } }
          }
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    if (!lessons) {
      throw new BadRequestException('Lessons not found');
    }
    return lessons.map((lesson) => ({
      id: lesson.id.toString(),
      name: lesson.title,
      fileUrl: lesson.url,
      type: lesson.type,
      subjectId: lesson.subjectId.toString(),
      description: lesson.description,
      createdAt: lesson.createdAt,
      createdBy: {
        id: lesson.subject.teacher.id.toString(),
        name: lesson.subject.teacher.name,
        email: lesson.subject.teacher.email,
      },
      groups: lesson.groups.map(lg => ({
        id: lg.group.id.toString(),
        name: lg.group.name
      }))
    }));
  }

  update(id: number, updateLessonDto: UpdateLessonDto) {
    return `This action updates a #${id} lesson`;
  }

  async remove(id: number) {
    let lesson = await this.prisma.lesson.findUnique({
      where: {
        id: id
      }
    });
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }
    await this.prisma.lesson.delete({
      where: {
        id: id
      }
    });
    this.cloudinaryService.deleteFile(lesson.publicId);
    return { message: 'Lesson deleted successfully' };
  }

  async addLessonToAnyGroup(file: Express.Multer.File, CreateLessonDto: CreateLessonDto, subjectId: number, groupIds: number[], userId: number): Promise<Lesson> {
    if (!subjectId) {
      throw new BadRequestException('subjectId is required');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!groupIds || groupIds.length === 0) {
      throw new BadRequestException('At least one groupId is required');
    }
    
    // Check if the teacher owns the subject
    let subject = await this.prisma.subject.findUnique({
      where: {
        id: subjectId,
        teacherId: userId
      }
    });
    if (!subject) {
      throw new BadRequestException('Subject not found or you do not have permission to add lessons to this subject');
    }
    
    // Verify all groups exist
    let groups = await this.prisma.group.findMany({
      where: {
        id: { in: groupIds }
      }
    });
    if (groups.length !== groupIds.length) {
      throw new BadRequestException("One or more groups not found");
    }

    const result: UploadApiResponse = await this.cloudinaryService.uploadFile(file).catch((err) => {
      console.log(err);
      throw new BadRequestException('Error uploading file');
    });

    let type: string;
    switch (file.mimetype) {
      case 'video/mp4':
        type = matrialType.video as string;
        break;
      case 'application/pdf':
        type = matrialType.pdf as string;
        break;
      default:
        type = matrialType.document as string;
    }

    let lesson = await this.prisma.lesson.create({
      data: {
        description: CreateLessonDto.description,
        title: CreateLessonDto.title,
        url: result.secure_url,
        type: type,
        subjectId: subjectId,
        publicId: result.public_id
      }
    });

    // Create lesson-group relationships
    await this.prisma.lessonGroup.createMany({
      data: groupIds.map(groupId => ({
        lessonId: lesson.id,
        groupId: groupId
      }))
    });

    // Return lesson with groups
    let   lessonWithGroups = await this.prisma.lesson.findUnique({
      where: { id: lesson.id },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });

    return lessonWithGroups!;
  }

  async getLessonsForGroup(groupId: number): Promise<IMaterial[]> {
    let lessons = await this.prisma.lesson.findMany({
      where: {
        groups: {
          some: {
            groupId: groupId
          }
        }
      },
      include: {
        subject: {
          select: {
            title: true,
            description: true,
            teacher: { select: { name: true, email: true, id: true } }
          }
        },
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
    return lessons.map((lesson) => ({
      id: lesson.id.toString(),
      name: lesson.title,
      fileUrl: lesson.url,
      type: lesson.type,
      subjectId: lesson.subjectId.toString(),
      description: lesson.description,
      createdAt: lesson.createdAt,
      createdBy: {
        id: lesson.subject.teacher.id.toString(),
        name: lesson.subject.teacher.name,
        email: lesson.subject.teacher.email,
      },
      groups: lesson.groups.map(lg => ({
        id: lg.group.id.toString(),
        name: lg.group.name
      }))
    }));
  }

  async addLessonToGroups(lessonId: number, groupIds: number[], userId: number): Promise<Lesson> {
    // Check if lesson exists and user owns the subject
    let lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        subject: true
      }
    });
    
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }
    
    if (lesson.subject.teacherId !== userId) {
      throw new BadRequestException('You do not have permission to modify this lesson');
    }
    
    // Verify all groups exist
    let groups = await this.prisma.group.findMany({
      where: {
        id: { in: groupIds }
      }
    });
    if (groups.length !== groupIds.length) {
      throw new BadRequestException("One or more groups not found");
    }
    
    // Check which groups the lesson is not already assigned to
    let existingGroups = await this.prisma.lessonGroup.findMany({
      where: {
        lessonId: lessonId,
        groupId: { in: groupIds }
      }
    });
    
    let existingGroupIds = existingGroups.map(eg => eg.groupId);
    let newGroupIds = groupIds.filter(gId => !existingGroupIds.includes(gId));
    
    if (newGroupIds.length === 0) {
      throw new BadRequestException('Lesson is already assigned to all specified groups');
    }
    
    // Add lesson to new groups
    await this.prisma.lessonGroup.createMany({
      data: newGroupIds.map(groupId => ({
        lessonId: lessonId,
        groupId: groupId
      }))
    });
    
    // Return updated lesson
    let lessonWithGroups = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });
    
    return lessonWithGroups!;
  }

  async removeLessonFromGroups(lessonId: number, groupIds: number[], userId: number): Promise<Lesson> {
    // Check if lesson exists and user owns the subject
    let lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        subject: true
      }
    });
    
    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }
    
    if (lesson.subject.teacherId !== userId) {
      throw new BadRequestException('You do not have permission to modify this lesson');
    }
    
    // Remove lesson from specified groups
    await this.prisma.lessonGroup.deleteMany({
      where: {
        lessonId: lessonId,
        groupId: { in: groupIds }
      }
    });
    
    // Return updated lesson
    let lessonWithGroups = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    });
    
    return lessonWithGroups!;
  }
}