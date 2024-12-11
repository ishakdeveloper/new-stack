ALTER TABLE "categories" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;