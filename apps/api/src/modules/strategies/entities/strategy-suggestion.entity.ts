import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A community-supplied strategy name submitted during onboarding. It contains
 * no user identifier, so discovery never exposes the submitter's identity.
 */
@Entity({ name: 'strategy_suggestions' })
@Index(['normalizedName'], { unique: true })
export class StrategySuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 160 })
  name!: string;

  @Column({ name: 'normalized_name', length: 160 })
  normalizedName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
