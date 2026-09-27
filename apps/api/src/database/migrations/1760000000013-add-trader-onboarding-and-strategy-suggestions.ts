import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTraderOnboardingAndStrategySuggestions1760000000013 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_profiles_preferred_trade_enum" AS ENUM ('crypto', 'forex', 'indices', 'all')`);
    await queryRunner.query(`CREATE TYPE "user_profiles_preferred_strategy_enum" AS ENUM ('smc', 'ict', 'algo', 'msnr', 'price_action', 'custom')`);
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD "preferred_trade" "user_profiles_preferred_trade_enum", ADD "preferred_strategy" "user_profiles_preferred_strategy_enum", ADD "custom_strategy" varchar(160)`);
    await queryRunner.query(`CREATE TABLE "strategy_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" varchar(160) NOT NULL, "normalized_name" varchar(160) NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "UQ_strategy_suggestions_normalized_name" UNIQUE ("normalized_name"), CONSTRAINT "PK_strategy_suggestions" PRIMARY KEY ("id"))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "strategy_suggestions"`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "custom_strategy", DROP COLUMN "preferred_strategy", DROP COLUMN "preferred_trade"`);
    await queryRunner.query(`DROP TYPE "user_profiles_preferred_strategy_enum"`);
    await queryRunner.query(`DROP TYPE "user_profiles_preferred_trade_enum"`);
  }
}
