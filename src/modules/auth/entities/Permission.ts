import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ unique: true, name: 'name' })
  name: string; // e.g., 'POST:/api/chat'

  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string;
}
