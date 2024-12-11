ALTER TABLE "channels" ALTER COLUMN "categoryId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "isPrivate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "isPrivate" boolean DEFAULT false NOT NULL;