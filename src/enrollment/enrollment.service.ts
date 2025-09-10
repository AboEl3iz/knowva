import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Membership, NotificationType, Status } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { GroupService } from 'src/group/group.service';

@Injectable()
export class EnrollmentService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly groupService: GroupService
  ) { }
  async create(groupId: number, userId: number): Promise<Membership> {
    let group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new BadRequestException("Group not found");

    // check if group is already completed
    if (group.status === 'COMPLETED') {
      throw new BadRequestException("Group is already completed");
    }

    let existingEnrollment = await this.prisma.membership.findFirst({
      where: {
        groupId: groupId,
        studentId: userId,
      },
    });
    if (existingEnrollment) throw new BadRequestException("User is already enrolled in this group");

    // create new enrollment (PENDING by default)
    let enrollment = await this.prisma.membership.create({
      data: {
        groupId: groupId,
        studentId: userId,
        status: Status.PENDING,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            capacity: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // send notification to teacher
    await this.notificationService.create(
      enrollment.group.createdBy.id,
      `You have a new enrollment request in group ${enrollment.group.name}`,
       NotificationType.GROUP_JOINED
    );
    this.notificationGateway.sendNotification(
      enrollment.group.createdBy.id.toString(),
      `You have a new enrollment request in group ${enrollment.group.name} from ${enrollment.student.id}`,
    );

    // 🔹 check group status after enrollment
    await this.groupService.checkAndUpdateStatus(groupId);

    return enrollment;
  }


  async findAll(groupId: number): Promise<Membership[]> {
    let group = await this.prisma.group.findUnique({
      where: {
        id: groupId

      },

    });
    if (!group) throw new BadRequestException("Group not found");
    let enrollments = await this.prisma.membership.findMany({
      where: {
        groupId: groupId
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    return enrollments;
  }

  async findAllByUser(userId: number): Promise<Membership[]> {
    let enrollments = await this.prisma.membership.findMany({
      where: {
        studentId: userId
      }
    });
    return enrollments;

  }

  async update(id: number) {
    let enrollment = await this.prisma.membership.findUnique({
      where: {
        id: id
      }
    });
    if (!enrollment) throw new BadRequestException("Enrollment not found");
    if (enrollment.status !== Status.PENDING) throw new BadRequestException("Enrollment already processed");
    let updatedEnrollment = await this.prisma.membership.update({
      where: {
        id: id
      },
      data: {
        status: Status.APPROVED,    
      }
    });

    await this.notificationService.create(enrollment.studentId, `Your enrollment in group ${enrollment.groupId} has been approved.`, NotificationType.GROUP_JOINED);
    this.notificationGateway.sendNotification(enrollment.studentId.toString(), `Your enrollment in group ${enrollment.groupId} has been approved.`);
    return updatedEnrollment;
  }

  async reject(id: number) {
    let enrollment = await this.prisma.membership.findUnique({
      where: {
        id: id
      }
    });
    if (!enrollment) throw new BadRequestException("Enrollment not found");
    if (enrollment.status !== Status.PENDING) throw new BadRequestException("Enrollment already processed");
    let updatedEnrollment = await this.prisma.membership.update({
      where: {
        id: id
      },
      data: {
        status: Status.REJECTED
      }
    });
    await this.notificationService.create(enrollment.studentId, `Your enrollment in group ${enrollment.groupId} has been rejected. `, NotificationType.GROUP_JOINED);
    this.notificationGateway.sendNotification(enrollment.studentId.toString(), `Your enrollment in group ${enrollment.groupId} has been rejected.`);
    return updatedEnrollment;
  }
}
