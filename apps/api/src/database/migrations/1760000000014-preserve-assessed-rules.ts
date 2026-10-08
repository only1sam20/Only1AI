import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreserveAssessedRules1760000000014 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "confluence_assessments" ADD COLUMN "rule_snapshot" jsonb');
    await queryRunner.query('ALTER TABLE "confluence_assessments" ADD COLUMN "strategy_snapshot" jsonb');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "confluence_assessments" DROP COLUMN "strategy_snapshot"');
    await queryRunner.query('ALTER TABLE "confluence_assessments" DROP COLUMN "rule_snapshot"');
  }
}
