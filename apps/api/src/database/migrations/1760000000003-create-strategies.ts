import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStrategies1760000000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "strategies_status_enum" AS ENUM ('draft', 'active')`);
    await queryRunner.query(`CREATE TABLE "strategies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "only1_core_id" uuid NOT NULL, "name" varchar(100) NOT NULL, "description" text, "timeframe" varchar(32), "status" "strategies_status_enum" NOT NULL DEFAULT 'draft', "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_strategies" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "strategies" ADD CONSTRAINT "FK_strategies_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_strategies_core" FOREIGN KEY ("only1_core_id") REFERENCES "only1_cores"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE INDEX "IDX_strategies_user_id" ON "strategies" ("user_id"); CREATE INDEX "IDX_strategies_only1_core_id" ON "strategies" ("only1_core_id")`);
    await queryRunner.query(`CREATE TABLE "strategy_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "strategy_id" uuid NOT NULL, "category" varchar(48) NOT NULL, "condition" varchar(120) NOT NULL, "value" jsonb, "priority" smallint NOT NULL DEFAULT 50, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_strategy_rules" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "strategy_rules" ADD CONSTRAINT "FK_strategy_rules_strategy" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE`);
    await queryRunner.query(`CREATE INDEX "IDX_strategy_rules_strategy_id" ON "strategy_rules" ("strategy_id")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "strategy_rules"; DROP TABLE "strategies"; DROP TYPE "strategies_status_enum"`);
  }
}
