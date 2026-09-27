import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetAuthTokenType1760000000011 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "auth_tokens_type_enum" ADD VALUE IF NOT EXISTS 'password_reset'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "auth_tokens" WHERE "type" = 'password_reset'`);
    await queryRunner.query(`ALTER TABLE "auth_tokens" ALTER COLUMN "type" TYPE text`);
    await queryRunner.query(`DROP TYPE "auth_tokens_type_enum"`);
    await queryRunner.query(`CREATE TYPE "auth_tokens_type_enum" AS ENUM ('email_verification')`);
    await queryRunner.query(`ALTER TABLE "auth_tokens" ALTER COLUMN "type" TYPE "auth_tokens_type_enum" USING "type"::"auth_tokens_type_enum"`);
  }
}
