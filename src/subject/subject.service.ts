import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Subject } from '@prisma/client';
import { ISubject } from 'src/helper/interfaces/interfaces.response';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService,
  ) { }
  async create(createSubjectDto: CreateSubjectDto, userId: number): Promise<Subject> {
    let user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    let verify = await this.prisma.subject.findFirst({
      where: {
        title: createSubjectDto.title,
      },
    });

    if (verify) {
      throw new BadRequestException('Subject already exists');
    }

    let subject = await this.prisma.subject.create({
      data: {
        title: createSubjectDto.title,
        description: createSubjectDto.description,
        teacherId: userId,
      },
    });
    return subject;


  }



  async findOne(id: number) : Promise<ISubject> {
    if (!id) {
      throw new BadRequestException('Subject not found');
    }
    let subject = await this.prisma.subject.findFirst({
      where: {
        id 
      },
      include: {
        
        teacher: {
          select: {
            password: false,
            id: true,
            email: true,
            name: true,
            
          },
        },
      },
    });
    if (!subject) {
      throw new BadRequestException('Subject not found');
    }
    return {
      id: subject.id.toString(),
      name: subject.title,
      description: subject.description || '',
      createdAt: subject.createdAt,
      createdBy: {
        id: subject.teacher.id.toString(),
        email: subject.teacher.email,
        name: subject.teacher.name,
      },
    };
  }

  async findall(): Promise<ISubject[]> {
    let subjects = await this.prisma.subject.findMany({
      include: {
        teacher: {
          select: {
            password: false,
            id: true,
            email: true,
            name: true,
            
          },
        },
      },
      
    });
    return subjects.map((subject) => {
      return {
        id: subject.id.toString(),
        name: subject.title,
        description: subject.description || '',
        createdAt: subject.createdAt,
        createdBy: {
          id: subject.teacher.id.toString(),
          email: subject.teacher.email,
          name: subject.teacher.name,
        },
      };
    });
  }

 async findallforteacher( userId: number): Promise<ISubject[]> {
    let subjects = await this.prisma.subject.findMany({
      where: {
        teacherId: userId
      },
      include: {
        teacher: {
          select: {
            password: false,
            id: true,
            email: true,
            name: true,
            
          },
        },
      },
      
    });
    return subjects.map((subject) => {
      return {
        id: subject.id.toString(),
        name: subject.title,
        description: subject.description || '',
        createdAt: subject.createdAt,
        createdBy: {
          id: subject.teacher.id.toString(),
          email: subject.teacher.email,
          name: subject.teacher.name,
        },
      };
    });
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto , userId: number): Promise<ISubject> {

    let subject = await this.prisma.subject.findUnique({
      where: {
        id: id,
      },
    });
    if (!subject) {
      throw new BadRequestException('Subject not found');
    }
    if (subject.teacherId !== userId) {
      throw new BadRequestException('You are not authorized to update this subject');
    }
    let updatedSubject = await this.prisma.subject.update({
      where: {
        id: id,
      },
      data: {
        title: updateSubjectDto.title,
        description: updateSubjectDto.description,
      },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
            
          },
        },
      },
    });
    return {
      id: updatedSubject.id.toString(),
      name: updatedSubject.title,
      description: updatedSubject.description || '',
      createdAt: updatedSubject.createdAt,
      createdBy: {
        id: updatedSubject.teacherId.toString(),
        name: updatedSubject.teacher.name,
        email: updatedSubject.teacher.email,
        
      },
    };

  }

  async remove(id: number , userId: number) {
    let subject = await this.prisma.subject.findUnique({
      where: {
        id: id,
      },
    });
    if (!subject) {
      throw new BadRequestException('Subject not found');
    }
    if (subject.teacherId !== userId) {
      throw new BadRequestException('You are not authorized to delete this subject');
    }
    let deletedSubject = await this.prisma.subject.delete({
      where: {
        id: id,
      },
    });
    return { message: 'Subject deleted successfully'};
  }
}
