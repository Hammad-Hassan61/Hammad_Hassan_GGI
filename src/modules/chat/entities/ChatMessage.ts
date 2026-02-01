import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { ChatSession } from './ChatSession';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => ChatSession, (session) => session.messages)
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession;

  @Column('text', { name: 'role' })
  role: 'user' | 'assistant';

  @Column('text', { name: 'content' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
