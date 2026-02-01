import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum SubscriptionTier {
  BASIC = 'Basic',
  PRO = 'Pro',
  ENTERPRISE = 'Enterprise',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'tier' })
  tier: SubscriptionTier;

  @Column({ name: 'name' })
  name: string;

  @Column('decimal', { name: 'monthly_price' })
  monthlyPrice: number;

  @Column('decimal', { name: 'yearly_price' })
  yearlyPrice: number;

  @Column({ name: 'monthly_max_messages' })
  monthlyMaxMessages: number;

  @Column({ name: 'yearly_max_messages' })
  yearlyMaxMessages: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
