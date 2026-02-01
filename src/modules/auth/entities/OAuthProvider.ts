import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('oauth_providers')
export class OAuthProvider {
  @PrimaryColumn({ name: 'id' })
  id: string; // e.g., 'google', 'microsoft'

  @Column({ name: 'name' })
  name: string;
}
