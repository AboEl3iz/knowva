import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards
} from '@nestjs/common';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-chat.dto';
import { CreateMessageDto } from './dto/create-massege.dto';
import { PaginationDto } from './dto/pagination.dto';
import { Roles } from 'src/decorator/decorator/roles.decorator';
import { Role } from 'src/decorator/enums/roles';
import { AuthorizationGuard } from 'src/guards/authorization.guard';


@Controller('conversations')
@UseGuards(AuthenticationGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    // Direct conversation (student-teacher)
    @Post('direct')
    /**
     * Get or create direct conversation between student and teacher
     * @param req Express request
     * @param dto CreateConversationDto
     * @returns Conversation object
     */
    async getOrCreateDirectConversation(
        @Req() req,
        @Body() dto: CreateConversationDto,
    ) {
        return this.chatService.getOrCreateConversation(req.user.id, dto);
    }

    // Group conversation (for students + teacher of the subject)
    @Post('group/:groupId')
    @Roles(Role.TEACHER)
    @UseGuards(AuthorizationGuard)
    
    /**
     * Get or create group conversation for a given subject ID
     * @param req Express request
     * @param groupId ID of the subject
     * @returns Conversation object
     */
    async getOrCreateGroupConversation(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Req() req : any
    ) {
        return this.chatService.getOrCreateGroupConversation(groupId , +req.user.id);
    }

    // All conversations (direct + group)
    @Get()



    /**
     * Get all conversations of the user (direct and group)
     * @param req Express request
     * @returns Array of conversation objects
     */
    async getAllConversations(@Req() req) {
        return this.chatService.getAllConversations(req.user.id);
    }

    // Unread conversations
    @Get('unread')
    /**
     * Get all conversations with unread messages
     * @param req Express request
     * @returns Array of conversation objects
     */

    async getUnreadConversations(@Req() req) {
        return this.chatService.getUnreadConversations(req.user.id);
    }

    // Active chats (with messages)
    @Get('active')
    /**
     * Get all active chats for the current user
     * @param req Express request
     * @returns Array of conversation objects
     */
    async getActiveChats(@Req() req) {
        return this.chatService.getActiveChats(req.user.id);
    }

    // Send a message (direct or group)
    @Post('messages')

    /**
     * Send a message in a conversation
     * @param req Express request
     * @param dto CreateMessageDto
     * @returns Message object
     */
    async sendMessage(
        @Req() req,
        @Body() dto: CreateMessageDto,
    ) {
        return this.chatService.sendMessage(req.user.id, dto);
    }

    // Paginate messages in a conversation
    @Get(':conversationId/messages')
    /**
     * Paginate messages in a conversation
     * @param req Express request
     * @param conversationId ID of the conversation to get messages for
     * @param pagination Pagination options (skip and take)
     * @returns Array of message objects
     */
    async getMessages(
        @Req() req,
        @Param('conversationId', ParseIntPipe) conversationId: number,
        @Query() pagination: PaginationDto,
    ) {
        return this.chatService.getMessages(conversationId, pagination, req.user.id);
    }

    // Mark messages as read
    @Patch(':conversationId/messages/read')

    async markAsRead(
        @Req() req,
        @Param('conversationId', ParseIntPipe) conversationId: number,
    ) {
        return this.chatService.markMessagesAsRead(conversationId, req.user.id);
    }

    // Get unread count in a conversation
    @Get(':conversationId/messages/unread-count')

    async getUnreadCount(
        @Req() req,
        @Param('conversationId', ParseIntPipe) conversationId: number,
    ) {
        return this.chatService.getUnreadCount(conversationId, req.user.id);
    }
}

