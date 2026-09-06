import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOnly1Cores1760000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "only1_cores_status_enum" AS ENUM ('active', 'paused')`);
    await queryRunner.query(`CREATE TABLE "only1_cores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "name" varchar(80) NOT NULL, "description" text, "status" "only1_cores_status_enum" NOT NULL DEFAULT 'paused', "analysis_interval_minutes" smallint NOT NULL DEFAULT 60, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_only1_cores" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "only1_cores" ADD CONSTRAINT "FK_only1_cores_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE INDEX "IDX_only1_cores_user_id" ON "only1_cores" ("user_id")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "only1_cores"`);
    await queryRunner.query(`DROP TYPE "only1_cores_status_enum"`);
  }
}
