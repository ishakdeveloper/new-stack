DROP INDEX IF EXISTS "unique_name_discriminator";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "discriminator";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_name_unique" UNIQUE("name");