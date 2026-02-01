import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './User';
import { OAuthProvider } from './OAuthProvider';

@Entity('user_oauths')
export class UserOAuth {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => OAuthProvider)
  @JoinColumn({ name: 'provider_id' })
  provider: OAuthProvider;

  @Column({ name: 'provider_user_id' })
  providerUserId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'other_relevant_information' })
  otherRelevantInformation: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
