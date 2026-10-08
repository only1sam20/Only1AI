import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum PreferredTrade {
  CRYPTO = 'crypto',
  FOREX = 'forex',
  INDICES = 'indices',
  ALL = 'all',
}

export enum PreferredStrategy {
  SMC = 'smc',
  ICT = 'ict',
  ALGO = 'algo',
  MSNR = 'msnr',
  PRICE_ACTION = 'price_action',
  CUSTOM = 'custom',
}

@Entity({ name: 'user_profiles' })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 80, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'preferred_trade', type: 'enum', enum: PreferredTrade, nullable: true })
  preferredTrade!: PreferredTrade | null;

  @Column({ name: 'preferred_strategy', type: 'enum', enum: PreferredStrategy, nullable: true })
  preferredStrategy!: PreferredStrategy | null;

  @Column({ name: 'custom_strategy', type: 'varchar', length: 160, nullable: true })
  customStrategy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
