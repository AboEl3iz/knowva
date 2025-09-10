import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket, WsException } from '@nestjs/websockets';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Server, Socket } from 'socket.io';
import { BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/guards/ws.guard';
import { JwtService } from '@nestjs/jwt';


@WebSocketGateway( {
  cors: {
    origin: '*',
  },
})

export class NotificationGateway {
  constructor(private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) { }
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.headers['authorization']?.split(' ')[1];
    if (!token) {
      client.disconnect();
      throw new NotFoundException('Missing auth token');
      

    }

    try {
      const payload = this.jwtService.verify(token);
      (client as any).user = payload;
      console.log(`✅ WS Authenticated user: ${payload.id}`);
      const userId = (client as any).user.id;
      if (userId) {
        client.join(userId.toString());
        console.log(`User ${userId} joined their room`);
      }
      console.log(`Client connected: ${client.id}`);
    } catch (err) {
      throw new BadRequestException('Invalid token');
      
    }


  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // @SubscribeMessage('join')
  // handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
  //   client.join(userId);
  //   console.log(`User ${userId} joined room`);
  // }

  sendNotification(userId: string, message: string) {
    console.log(`Sending notification to user ${userId}: ${message}`);
    this.server.to(userId).emit('notification', { message });
  }
}
