import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_banner_shape" ADD VALUE 'bunny';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DEFAULT 'stars'::text;
  DROP TYPE "public"."enum_users_banner_shape";
  CREATE TYPE "public"."enum_users_banner_shape" AS ENUM('stars', 'spiral', 'flower', 'squiggle', 'rose', 'moon', 'bow', 'wing');
  ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DEFAULT 'stars'::"public"."enum_users_banner_shape";
  ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DATA TYPE "public"."enum_users_banner_shape" USING "banner_shape"::"public"."enum_users_banner_shape";`)
}
