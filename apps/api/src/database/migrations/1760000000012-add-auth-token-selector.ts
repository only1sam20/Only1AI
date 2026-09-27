import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthTokenSelector1760000000012 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "auth_tokens" ADD COLUMN IF NOT EXISTS "selector" character varying(24)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_auth_tokens_type_selector_open" ON "auth_tokens" ("type", "selector") WHERE "used_at" IS NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_auth_tokens_type_selector_open"');
    await queryRunner.query('ALTER TABLE "auth_tokens" DROP COLUMN IF EXISTS "selector"');
  }
}
