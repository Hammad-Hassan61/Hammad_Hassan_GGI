import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rate_limiting_configs')
export class RateLimitingConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'apply_to' })
  applyTo: string;

  @Column({ default: true, name: 'is_ip_based' })
  isIpBased: boolean;

  @Column({ default: false, name: 'is_per_user' })
  isPerUser: boolean;

  @Column({ name: 'points' })
  points: number;

  @Column({ name: 'duration' })
  duration: number;

  @Column({ default: '10kb', name: 'max_request_size' })
  maxRequestSize: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  createdAt: Date;
}
