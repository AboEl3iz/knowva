import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Group } from '@prisma/client';
import { IGroup } from 'src/helper/interfaces/interfaces.response';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) { }
  async create(createGroupDto: CreateGroupDto, subjectId: number, userId: number): Promise<Group> {
    let subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new BadRequestException("Subject not found");
    let group = await this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        capacity: createGroupDto.capacity,
        subjectId: subjectId,
        createdById: userId
      },
    });
    return group;
  }

  async toggleGroupStatus(groupId: number, userId: number): Promise<IGroup> {
  const group = await this.prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: {
        select: { student: { select: { id: true } } },
        where: { status: 'APPROVED' },
      },
    },
  });

  if (!group) throw new BadRequestException("Group not found");

  if (group.createdById !== userId) {
    throw new BadRequestException("Only the creator can change this group status");
  }

  if (group.status === 'COMPLETED') {
    throw new BadRequestException("Cannot toggle a completed group");
  }

  // toggle status
  const newStatus = group.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  const updatedGroup = await this.prisma.group.update({
    where: { id: groupId },
    data: { status: newStatus },
    include: {
      memberships: {
        select: { student: { select: { id: true , name: true, email: true } } },
        where: { status: 'APPROVED' },
      },
    },
  });

  // map DB enum → API value
  let status: "complete" | "active" | "inactive";
  switch (updatedGroup.status) {
    case "COMPLETED":
      status = "complete";
      break;
    case "INACTIVE":
      status = "inactive";
      break;
    default:
      status = "active";
  }

  return {
    id: updatedGroup.id.toString(),
    name: updatedGroup.name,
    teacherId: updatedGroup.createdById.toString(),
    subjectId: updatedGroup.subjectId.toString(),
    capacity: updatedGroup.capacity.toString(),
    studentIds: updatedGroup.memberships.map(m => {
      return {
        id: m.student.id.toString(),
        name: m.student.name,
        email: m.student.email
      }
    }),
    status,
    createdAt: updatedGroup.createdAt,
  };
}


  async checkAndUpdateStatus(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: { where: { status: 'APPROVED' } },
      },
    });

    if (!group) throw new BadRequestException("Group not found");

    // Auto mark as completed if membership count == capacity
    if (group.memberships.length >= group.capacity && group.status !== 'COMPLETED') {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { status: 'INACTIVE' },
      });
    }
  }


  async findAllBySubject(subjectId: number): Promise<IGroup[]> {
    let subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new BadRequestException("Subject not found");

    let groups = await this.prisma.group.findMany({
      where: { subjectId: subjectId },
      include: {
        memberships: {
          select: {
            student: { select: { id: true, name: true, email: true } },
          },
          where: { status: 'APPROVED' },
        },
        subject: { select: { id: true, title: true, description: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return groups.map((group) => {
      let status: "complete" | "active" | "inactive";
      switch (group.status) {
        case 'COMPLETED':
          status = 'complete';
          break;
        case 'INACTIVE':
          status = 'inactive';
          break;
        default:
          status = 'active';
      }

      return {
        id: group.id.toString(),
        name: group.name,
        teacherId: group.createdById.toString(),
        subjectId: group.subject.id.toString(),
        capacity: group.capacity.toString(),
        studentIds: group.memberships.map((m) => {
          return {
            id: m.student.id.toString(),
            name: m.student.name,
            email: m.student.email,
          };
        }),
        status,
        createdAt: group.createdAt,
      };
    });
  }

  async findAllByTeacher(teacherId: number): Promise<IGroup[]> {
    

    let groups = await this.prisma.group.findMany({
      where: { 
        createdById: teacherId
       },
      include: {
        memberships: {
          select: {
            student: { select: { id: true, name: true, email: true } },
          },
          where: { status: 'APPROVED' },
        },
        subject: { select: { id: true, title: true, description: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return groups.map((group) => {
      let status: "complete" | "active" | "inactive";
      switch (group.status) {
        case 'COMPLETED':
          status = 'complete';
          break;
        case 'INACTIVE':
          status = 'inactive';
          break;
        default:
          status = 'active';
      }

      return {
        id: group.id.toString(),
        name: group.name,
        teacherId: group.createdById.toString(),
        subjectId: group.subject.id.toString(),
        capacity: group.capacity.toString(),
        studentIds: group.memberships.map((m) => {
          return {
            id: m.student.id.toString(),
            name: m.student.name,
            email: m.student.email,
          };
        }),
        status,
        createdAt: group.createdAt,
      };
    });
  }

  async findOne(id: number): Promise<IGroup> {
    let group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            title: true,
            description: true,
            teacher: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        memberships: {
          select: {
            id: true,
            student: { select: { id: true, name: true, email: true } },
          },
          where: { status: 'APPROVED' },
        },
      },
    });

    if (!group) throw new BadRequestException("Group not found");

    let status: "complete" | "active" | "inactive";
    switch (group.status) {
      case "COMPLETED":
        status = "complete";
        break;
      case "INACTIVE":
        status = "inactive";
        break;
      default:
        status = "active";
    }

    return {
      id: group.id.toString(),
      name: group.name,
      teacherId: group.subject.teacher.id.toString(),
      subjectId: group.subject.id.toString(),
      capacity: group.capacity.toString(),
      studentIds: group.memberships.map((m) => {
        return {
          id: m.student.id.toString(),
          name: m.student.name,
          email: m.student.email,
        };
      }),
      status,
      createdAt: group.createdAt,
    };
  }


  async update(id: number, updateGroupDto: UpdateGroupDto, userId: number): Promise<Group> {

    let group = await this.prisma.group.findUnique({ where: { id: id, createdById: userId } });
    if (!group) throw new BadRequestException("Group not found");

    let updatedGroup = await this.prisma.group.update({
      where: { id: id },
      data: {
        name: updateGroupDto.name,
      },
    });
    return updatedGroup;

  }

  async remove(id: number, userId: number) {
    let group = await this.prisma.group.findUnique({ where:  { id: id, createdById: userId  },
    include: {
      memberships: {
        select: {
          student: { select: { id: true, name: true, email: true } },
        },
        
      },
    }
   });
    if (!group) throw new BadRequestException("Group not found");
    if(group.memberships.length > 0) throw new BadRequestException("Group has enrolled students");
    
    await this.prisma.group.delete({ where: { id: id } });
    return { message: "Group deleted successfully" };
  }
}
