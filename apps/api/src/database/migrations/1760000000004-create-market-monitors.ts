import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateMarketMonitors1760000000004 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TYPE "market_monitors_market_type_enum" AS ENUM ('forex','crypto','equity','index','commodity'); CREATE TYPE "market_monitors_status_enum" AS ENUM ('active','paused')`);
    await q.query(`CREATE TABLE "market_monitors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "only1_core_id" uuid NOT NULL, "strategy_id" uuid, "symbol" varchar(32) NOT NULL, "market_type" "market_monitors_market_type_enum" NOT NULL, "timeframe" varchar(32) NOT NULL, "status" "market_monitors_status_enum" NOT NULL DEFAULT 'paused', "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_market_monitors" PRIMARY KEY ("id")); ALTER TABLE "market_monitors" ADD CONSTRAINT "FK_monitor_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_monitor_core" FOREIGN KEY ("only1_core_id") REFERENCES "only1_cores"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_monitor_strategy" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE SET NULL; CREATE INDEX "IDX_market_monitors_user_id" ON "market_monitors"("user_id")`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query(`DROP TABLE "market_monitors"; DROP TYPE "market_monitors_status_enum"; DROP TYPE "market_monitors_market_type_enum"`); }
}
