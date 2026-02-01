import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/User';
import { SubscriptionPlan } from './SubscriptionPlan';

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => User, (user) => user.subscriptions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ nullable: true, name: 'renewal_date' })
  renewalDate: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: true, name: 'auto_renew' })
  autoRenew: boolean;

  @Column({ name: 'max_messages' })
  maxMessages: number;

  @Column({ default: 0, name: 'used_messages' })
  usedMessages: number;

  @Column('decimal', { name: 'price' })
  price: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
