import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/User';
import { ChatMessage } from './ChatMessage';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => User, (user) => user.chats)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ChatMessage, (message) => message.chatSession)
  messages: ChatMessage[];

  @Column({ name: 'tokens_used', default: 0 })
  tokensUsed: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: any;
}
