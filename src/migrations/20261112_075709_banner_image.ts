import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_banner_image" AS ENUM('flower-haze', 'magnolia', 'cream-lace', 'fawn', 'pink-roses', 'pastel-plaid', 'brown-plaid', 'little-girl', 'grey-lace', 'surf', 'cows', 'piano');
  ALTER TYPE "public"."enum_users_banner_shape" ADD VALUE 'none';
  ALTER TABLE "users" ADD COLUMN "banner_image" "enum_users_banner_image";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DEFAULT 'stars'::text;
  DROP TYPE "public"."enum_users_banner_shape";
  CREATE TYPE "public"."enum_users_banner_shape" AS ENUM('stars', 'spiral', 'flower', 'squiggle', 'rose', 'moon', 'bow', 'wing', 'bunny');
  ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DEFAULT 'stars'::"public"."enum_users_banner_shape";
  ALTER TABLE "users" ALTER COLUMN "banner_shape" SET DATA TYPE "public"."enum_users_banner_shape" USING "banner_shape"::"public"."enum_users_banner_shape";
  ALTER TABLE "users" DROP COLUMN "banner_image";
  DROP TYPE "public"."enum_users_banner_image";`)
}
