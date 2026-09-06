import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum StrategyStatus { DRAFT = 'draft', ACTIVE = 'active' }

@Entity({ name: 'strategies' })
export class Strategy {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Index() @Column({ name: 'only1_core_id', type: 'uuid' }) only1CoreId!: string;
  @Column({ length: 100 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ length: 32, nullable: true }) timeframe!: string | null;
  @Column({ type: 'enum', enum: StrategyStatus, default: StrategyStatus.DRAFT }) status!: StrategyStatus;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
