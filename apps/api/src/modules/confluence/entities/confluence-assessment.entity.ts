import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
export enum ConfluenceOutcome { QUALIFIED = 'qualified', INSUFFICIENT = 'insufficient' }
@Entity({ name: 'confluence_assessments' })
export class ConfluenceAssessment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ name: 'only1_core_id', type: 'uuid' }) only1CoreId!: string;
  @Column({ name: 'strategy_id', type: 'uuid' }) strategyId!: string;
  @Column({ name: 'monitor_id', type: 'uuid', nullable: true }) monitorId!: string | null;
  @Column({ type: 'smallint' }) score!: number;
  @Column({ name: 'matched_rule_ids', type: 'jsonb' }) matchedRuleIds!: string[];
  @Column({ type: 'jsonb' }) observations!: Record<string, unknown>[];
  @Column({ type: 'enum', enum: ConfluenceOutcome }) outcome!: ConfluenceOutcome;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
