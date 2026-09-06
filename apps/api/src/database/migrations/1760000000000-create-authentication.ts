import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthentication1760000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" varchar(254) NOT NULL, "password_hash" varchar NOT NULL, "email_verified_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_users" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TYPE "auth_tokens_type_enum" AS ENUM ('email_verification')`);
    await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "auth_tokens_type_enum" NOT NULL, "token_hash" varchar NOT NULL, "expires_at" TIMESTAMPTZ NOT NULL, "used_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_auth_tokens" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_auth_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_tokens_user_id" ON "auth_tokens" ("user_id")`);
    await queryRunner.query(`CREATE TABLE "refresh_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" varchar NOT NULL, "expires_at" TIMESTAMPTZ NOT NULL, "revoked_at" TIMESTAMPTZ, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("user_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
    await queryRunner.query(`DROP TABLE "auth_tokens"`);
    await queryRunner.query(`DROP TYPE "auth_tokens_type_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
