import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'strategy_rules' })
export class StrategyRule {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'strategy_id', type: 'uuid' }) strategyId!: string;
  @Column({ length: 48 }) category!: string;
  @Column({ length: 120 }) condition!: string;
  @Column({ type: 'jsonb', nullable: true }) value!: Record<string, unknown> | null;
  @Column({ type: 'smallint', default: 50 }) priority!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
