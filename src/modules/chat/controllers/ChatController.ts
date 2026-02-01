import { Response, NextFunction } from 'express';
import { ChatService } from '../services/ChatService';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { z } from 'zod';
import {CHAT_QUESTION_MAX_LENGTH, CHAT_QUESTION_MIN_LENGTH, HttpStatus} from '../../../shared/constants';
import { createModuleLogger } from '../../../shared/logger';

const logger = createModuleLogger('chat');

const chatSchema = z.object({
  question: z.string().min(CHAT_QUESTION_MIN_LENGTH).max(CHAT_QUESTION_MAX_LENGTH),
}).strict();

export class ChatController {
  private chatService = new ChatService();

  async askQuestion(req: AuthenticatedRequest, res: Response) {
    const validation = chatSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid input', details: validation.error.format() });
    }

    const result = await this.chatService.processUserQuestion(req.user!.id, validation.data.question);
    
    if ('error' in result) {
      logger.error(`Chat error for user ${req.user!.id}: ${result.error}`);
      return res.status(result.status || HttpStatus.FORBIDDEN).json({ error: result.error });
    }

    logger.info(`Chat success for user ${req.user!.id}, chatId: ${result.chatId}`);
    return res.status(HttpStatus.OK).json(result);
  }

  async getMyChats(req: AuthenticatedRequest, res: Response) {
    const chats = await this.chatService.getUserChats(req.user!.id);
    return res.status(HttpStatus.OK).json(chats);
  }

  async getChatInfo(req: AuthenticatedRequest, res: Response) {
    const chatId = req.params.id as string;
    const chat = await this.chatService.getChatById(chatId, req.user!.id);
    if (!chat) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Chat not found' });
    }
    return res.status(HttpStatus.OK).json(chat);
  }
}
