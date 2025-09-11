import { 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Put, 
  Req, 
  UseGuards, 
  Query 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { NotificationType } from '@prisma/client';

// ============= RESPONSE DTOs =============

class NotificationDto {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  createdAt: Date;
}

class UnreadCountDto {
  unreadCount: number;
}

class SuccessResponseDto {
  success: boolean;
  message: string;
}

class ErrorResponseDto {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@ApiTags('Notifications')
@Controller('notification')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ 
  description: 'Unauthorized - Invalid or missing authentication token',
  type: ErrorResponseDto 
})
@ApiForbiddenResponse({ 
  description: 'Forbidden - Access denied',
  type: ErrorResponseDto 
})
@ApiInternalServerErrorResponse({ 
  description: 'Internal server error',
  type: ErrorResponseDto 
})
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Put('mark-as-read')
    @ApiOperation({ 
      summary: 'Mark all notifications as read',
      description: 'Marks all notifications for the authenticated user as read'
    })
    @ApiOkResponse({ 
      description: 'All notifications marked as read successfully',
      example: {
        affected: 5,
        success: true
      }
    })
    async markAllAsRead(@Req() req : any) {
        return await this.notificationService.markAllAsRead(+req.user.id);
    }

    @Get('unread-count')
    @ApiOperation({ 
      summary: 'Get unread notifications count',
      description: 'Returns the total count of unread notifications for the authenticated user'
    })
    @ApiOkResponse({ 
      description: 'Unread count retrieved successfully',
      type: Number,
      example: 5
    })
    async getUnreadCount(@Req() req : any) {
        return this.notificationService.getUnreadCount(+req.user.id);
    }

    @Get('user-notifications')
    @ApiOperation({ 
      summary: 'Get user notifications',
      description: 'Retrieves all notifications for the authenticated user, ordered by creation date (newest first)'
    })
    @ApiOkResponse({ 
      description: 'User notifications retrieved successfully',
      type: [NotificationDto],
      example: [
        {
          id: 1,
          userId: 123,
          message: "New message from teacher",
          read: false,
          createdAt: "2024-01-15T10:30:00Z"
        },
        {
          id: 2,
          userId: 123,
          message: "Assignment due tomorrow",
          read: true,
          createdAt: "2024-01-14T15:20:00Z"
        }
      ]
    })
    async getUserNotifications(@Req() req : any) {
        return this.notificationService.getUserNotifications(+req.user.id);
    }

    @Delete('delete-all')
    @ApiOperation({ 
      summary: 'Delete all notifications',
      description: 'Permanently deletes all notifications for the authenticated user'
    })
    @ApiOkResponse({ 
      description: 'All notifications deleted successfully',
      example: {
        count: 10,
        success: true
      }
    })
    async deleteAll(@Req() req : any) {
        return this.notificationService.deleteAll(+req.user.id);
    }

    @Get('by-type')
    @ApiOperation({ 
      summary: 'Get notifications by type',
      description: 'Retrieves all notifications of a specific type for the authenticated user'
    })
    @ApiQuery({ 
      name: 'type', 
      enum: NotificationType,
      description: 'The type of notifications to retrieve',
      example: 'MESSAGE',
      required: true
    })
    @ApiOkResponse({ 
      description: 'Notifications by type retrieved successfully',
      type: [NotificationDto],
      example: [
        {
          id: 1,
          userId: 123,
          message: "New message from teacher",
          read: false,
          createdAt: "2024-01-15T10:30:00Z"
        }
      ]
    })
    @ApiBadRequestResponse({ 
      description: 'Invalid notification type provided',
      type: ErrorResponseDto,
      example: {
        statusCode: 400,
        message: "Invalid notification type",
        error: "Bad Request",
        timestamp: "2024-01-15T10:30:00Z",
        path: "/notification/by-type"
      }
    })
    async getNotificationsByType(@Req() req: any, @Query('type') type: NotificationType) {
        return this.notificationService.getNotificationsByType(+req.user.id, type);
    }

    @Get('unread-count-by-type')
    @ApiOperation({ 
      summary: 'Get unread count by notification type',
      description: 'Returns the count of unread notifications for a specific type for the authenticated user'
    })
    @ApiQuery({ 
      name: 'type', 
      enum: NotificationType,
      description: 'The type of notifications to count',
      example: 'MESSAGE',
      required: true
    })
    @ApiOkResponse({ 
      description: 'Unread count by type retrieved successfully',
      type: Number,
      example: 3
    })
    @ApiBadRequestResponse({ 
      description: 'Invalid notification type provided',
      type: ErrorResponseDto
    })
    async getUnreadCountByType(@Req() req: any, @Query('type') type: NotificationType) {
        return this.notificationService.getUnreadCountByType(+req.user.id, type);
    }
}