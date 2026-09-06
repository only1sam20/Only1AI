import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum Only1CoreStatus { ACTIVE = 'active', PAUSED = 'paused' }

@Entity({ name: 'only1_cores' })
export class Only1Core {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ length: 80 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: Only1CoreStatus, default: Only1CoreStatus.PAUSED })
  status!: Only1CoreStatus;

  @Column({ name: 'analysis_interval_minutes', type: 'smallint', default: 60 })
  analysisIntervalMinutes!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
