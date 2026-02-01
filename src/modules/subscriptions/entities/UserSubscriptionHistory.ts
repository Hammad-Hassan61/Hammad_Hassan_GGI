import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/User';
import { SubscriptionPlan } from './SubscriptionPlan';

@Entity('user_subscriptions_history')
export class UserSubscriptionHistory {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'price_at_purchase' })
  priceAtPurchase: number;

  @Column({ name: 'max_messages' })
  maxMessages: number;

  @Column({ name: 'used_messages' })
  usedMessages: number;

  @Column({ name: 'status' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
