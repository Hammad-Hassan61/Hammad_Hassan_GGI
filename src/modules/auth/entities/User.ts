import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { UserSubscription } from '../../subscriptions/entities/UserSubscription';
import { ChatSession } from '../../chat/entities/ChatSession';
import { Role } from './Role';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ unique: true, name: 'email' })
  email: string;

  @Column({ nullable: true, name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'name' })
  name: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_locked' })
  isLocked: boolean;

  @Column({ default: 0, name: 'last_bad_tries' })
  lastBadTries: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_logged_in' })
  lastLoggedIn: Date;

  @Column({ nullable: true, name: 'last_location_access' })
  lastLocationAccess: string;

  @Column({ default: 0, name: 'free_messages_used_this_month' })
  freeMessagesUsedThisMonth: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_quota_reset_date' })
  lastQuotaResetDate: Date;

  @OneToMany(() => UserSubscription, (sub) => sub.user)
  subscriptions: UserSubscription[];

  @OneToMany(() => ChatSession, (chat) => chat.user)
  chats: ChatSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
