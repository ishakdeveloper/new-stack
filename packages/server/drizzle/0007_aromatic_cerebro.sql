ALTER TABLE "user" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discriminator" varchar(5) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_name_discriminator" ON "user" USING btree ("name","discriminator");