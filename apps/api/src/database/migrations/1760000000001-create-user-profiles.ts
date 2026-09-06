import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserProfiles1760000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('user', 'creator', 'admin')`);
    await queryRunner.query(`ALTER TABLE "users" ADD "role" "users_role_enum" NOT NULL DEFAULT 'user', ADD "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`CREATE TABLE "user_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "display_name" varchar(80), "timezone" varchar(64), "bio" text, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_profiles_user_id" UNIQUE ("user_id"), CONSTRAINT "PK_user_profiles" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_user_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_profiles"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active", DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
