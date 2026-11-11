import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_banner_shape" AS ENUM('stars', 'spiral', 'flower', 'squiggle', 'rose', 'moon', 'bow', 'wing');
  ALTER TABLE "users" ADD COLUMN "banner_color" varchar;
  ALTER TABLE "users" ADD COLUMN "banner_shape" "enum_users_banner_shape" DEFAULT 'stars';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "banner_color";
  ALTER TABLE "users" DROP COLUMN "banner_shape";
  DROP TYPE "public"."enum_users_banner_shape";`)
}
