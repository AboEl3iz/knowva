import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from './dto/create-massege.dto';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/guards/ws.guard';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ namespace: 'chat'  ,
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<number, string> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers['authorization']?.split(' ')[1];
      if (!token) {
        throw new WsException('Missing auth token');
      }

      const payload = await this.jwtService.verifyAsync(token);
      (client as any).user = payload; // attach user
      Logger.log(`✅ WS Authenticated user: ${payload.id}`);

      // store mapping userId -> socketId
      this.connectedUsers.set(payload.id, client.id);
      Logger.log(`User ${payload.id} connected on socket ${client.id}`);
    } catch (err) {
      Logger.error('WS Auth failed:', err.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        Logger.warn(`❌ User ${userId} disconnected`);
        break;
      }
    }
  }

  // ✅ Send new message
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: any,
  ) {
    const payload = typeof dto === 'string' ? JSON.parse(dto) : dto;
    const user = (client as any).user;

    Logger.log(`✉️ New WS message from user ${user.id}`, payload);

    // save message in DB
    const message = await this.chatService.sendMessage(
      user.id,
      payload as CreateMessageDto,
    );

    // notify sender
    client.emit('message_sent', message);

    // get conversation with participants
    const conversation = await this.chatService.getConversationById(
      payload.conversationId,
    );
    if (!conversation) return;

    if (conversation.isGroup) {
      // Group conversation: notify all approved members except sender
      const memberIds =
        conversation.group?.memberships
          .filter((m) => m.status === 'APPROVED' && m.studentId !== user.id)
          .map((m) => m.studentId) || [];

      // also notify teacher (group.createdById) if not sender
      if (conversation.group?.createdById !== user.id) {
        memberIds.push(conversation.group!.createdById);
      }

      for (const memberId of memberIds) {
        const recipientSocket = this.connectedUsers.get(memberId);
        if (recipientSocket) {
          this.server.to(recipientSocket).emit('new_message', message);

          const unreadCount = await this.chatService.getUnreadCount(
            payload.conversationId,
            memberId,
          );
          this.server.to(recipientSocket).emit('unread_count', {
            conversationId: payload.conversationId,
            unreadCount,
          });
        }
      }
    } else {
      // Direct conversation: notify the other party
      const recipientId =
        conversation.studentId === user.id
          ? conversation.teacherId
          : conversation.studentId;

      const recipientSocket = this.connectedUsers.get(recipientId!);
      if (recipientSocket) {
        this.server.to(recipientSocket).emit('new_message', message);

        const unreadCount = await this.chatService.getUnreadCount(
          payload.conversationId,
          recipientId!,
        );
        this.server.to(recipientSocket).emit('unread_count', {
          conversationId: payload.conversationId,
          unreadCount,
        });
      }
    }

    return message;
  }

  // ✅ Mar/k messages as read
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const user = (client as any).user;
    let conversationID : { conversationId: number } = typeof data === 'string' ? JSON.parse(data) : data;
    if (!conversationID.conversationId) {
    throw new WsException('conversationId is required');
    }
    Logger.log(`✉️ Read from user ${user.id} conversation ${conversationID.conversationId} and its type  ${typeof conversationID}`);
    await this.chatService.markMessagesAsRead(conversationID.conversationId, user.id);

    const unreadCount = await this.chatService.getUnreadCount(
      conversationID.conversationId,
      user.id,
    );

    client.emit('unread_count', {
      conversationId: conversationID.conversationId,
      unreadCount,
    });
  }
}
