import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AuthTokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity({ name: 'auth_tokens' })
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
  @Column({ type: 'enum', enum: AuthTokenType })
  type!: AuthTokenType;
  @Index()
  @Column({ length: 24, nullable: true })
  selector!: string | null;
  @Column({ name: 'token_hash' })
  tokenHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
