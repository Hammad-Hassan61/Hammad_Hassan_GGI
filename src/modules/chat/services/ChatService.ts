import { AppDataSource } from '../../../config/database';
import { User } from '../../auth/entities/User';
import { UserSubscription } from '../../subscriptions/entities/UserSubscription';
import { ChatSession } from '../entities/ChatSession';
import { ChatMessage } from '../entities/ChatMessage';
import { QuotaPolicy } from '../policies/QuotaPolicy';

export class ChatService {
  async processUserQuestion(userId: string, question: string) {
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const user = await transactionalEntityManager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) throw new Error('User not found');

      const activeSubscriptions = await transactionalEntityManager.find(UserSubscription, {
        where: { user: { id: userId }, isActive: true },
        order: { createdAt: 'DESC' },
        relations: ['plan'],
      });

      const quotaCheck = await QuotaPolicy.canUserMakeRequest(user, activeSubscriptions);

      if (!quotaCheck.allowed) {
        return { error: 'Quota exhausted', status: 403 };
      }

      if (quotaCheck.useFreeQuota) {
        user.freeMessagesUsedThisMonth += 1;
        await transactionalEntityManager.save(user);
      } else if (quotaCheck.subscriptionId) {
        const sub = activeSubscriptions.find((s) => s.id === quotaCheck.subscriptionId);
        if (sub && sub.maxMessages !== -1) {
          sub.usedMessages += 1;
          await transactionalEntityManager.save(sub);
        }
      }

      const answer = await this.getMockOpenAIResponse(question);
      const tokensUsed = Math.floor(Math.random() * 100) + 10;

      const chatSession = new ChatSession();
      chatSession.user = user;
      chatSession.tokensUsed = tokensUsed;
      chatSession.metadata = { timestamp: new Date() };

      await transactionalEntityManager.save(chatSession);

      const userMsg = new ChatMessage();
      userMsg.chatSession = chatSession;
      userMsg.role = 'user';
      userMsg.content = question;
      await transactionalEntityManager.save(userMsg);

      const assistantMsg = new ChatMessage();
      assistantMsg.chatSession = chatSession;
      assistantMsg.role = 'assistant';
      assistantMsg.content = answer;
      await transactionalEntityManager.save(assistantMsg);

      return {
        answer,
        tokensUsed,
        chatId: chatSession.id,
      };
    });
  }

  private async getMockOpenAIResponse(question: string): Promise<string> {
    const delay = parseInt(process.env.OPENAI_MOCK_DELAY);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return `This is a mocked response for your question: "${question}"`;
  }

  async getUserChats(userId: string) {
    const sessions = await AppDataSource.getRepository(ChatSession).find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });

    return sessions.map(session => ({
      id: session.id,
      tokensUsed: session.tokensUsed,
      metadata: session.metadata,
      createdAt: session.createdAt
    }));
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await AppDataSource.getRepository(ChatSession).findOne({
      where: { id: chatId, user: { id: userId } },
      relations: ['messages']
    });

    if (!chat) return null;

    return {
      id: chat.id,
      tokensUsed: chat.tokensUsed,
      metadata: chat.metadata,
      createdAt: chat.createdAt,
      messages: chat.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt
      }))
    };
  }
}
