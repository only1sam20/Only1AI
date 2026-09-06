import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedIndexes1760000000010 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_analyses_user_created_at" ON "analyses" ("user_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_created_at" ON "notifications" ("user_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_confluence_assessments_user_created_at" ON "confluence_assessments" ("user_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_marketplace_listings_status_created_at" ON "marketplace_listings" ("status", "created_at" DESC)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_marketplace_listings_status_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_confluence_assessments_user_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_analyses_user_created_at"`);
  }
}
