import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum MarketType { FOREX = 'forex', CRYPTO = 'crypto', EQUITY = 'equity', INDEX = 'index', COMMODITY = 'commodity' }
export enum MonitorStatus { ACTIVE = 'active', PAUSED = 'paused' }

@Entity({ name: 'market_monitors' })
export class MarketMonitor {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Index() @Column({ name: 'only1_core_id', type: 'uuid' }) only1CoreId!: string;
  @Column({ name: 'strategy_id', type: 'uuid', nullable: true }) strategyId!: string | null;
  @Column({ length: 32 }) symbol!: string;
  @Column({ name: 'market_type', type: 'enum', enum: MarketType }) marketType!: MarketType;
  @Column({ length: 32 }) timeframe!: string;
  @Column({ type: 'enum', enum: MonitorStatus, default: MonitorStatus.PAUSED }) status!: MonitorStatus;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
