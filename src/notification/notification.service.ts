import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PrismaService } from 'src/database/prisma.service';
import { Notification, NotificationType } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) { }
  async create(useId: number, message: string, type: NotificationType = NotificationType.GENERAL) : Promise<Notification> {
    let notification = await this.prisma.notification.create({
      data: {
        userId: useId,
        message: message,
        type: type
      }
    });
    return notification;
  }

  async markAllAsRead( userid: number)  {
    let notification = await this.prisma.notification.findMany({
      where: {
        userId: userid
      }
    });

    await this.prisma.notification.updateMany({
      where: {
        userId: userid
      },
      data: {
        read: true
      }
    });

    

  }

  async getUserNotifications(userId: number) : Promise<Notification[]> {
    let notifications = await this.prisma.notification.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return notifications;
  }

  async getUnreadCount(userId: number) : Promise<{ count: number }> {
    let count = await this.prisma.notification.count({
      where: {
        userId: userId,
        read: false
      },
    });
    return {
      count: count
    };
  }

  async deleteAll(userId: number) : Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        userId: userId
      }
    });
    
  }

  async getNotificationsByType(userId: number, type: NotificationType) : Promise<Notification[]> {
    let notifications = await this.prisma.notification.findMany({
      where: {
        userId: userId,
        type: type
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return notifications;
  }

  async getUnreadCountByType(userId: number, type: NotificationType) : Promise<{ count: number }> {
    let count = await this.prisma.notification.count({
      where: {
        userId: userId,
        read: false,
        type: type
      },
    });
    return {
      count: count
    };
  }
}




