ALTER TABLE "user" ADD COLUMN "discriminator" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "accentColor" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pronouns" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'offline' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "customStatus" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "currentActivity" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isPremium" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "badges" text[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "flags" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "theme" text DEFAULT 'dark';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "enableDM" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" text DEFAULT 'en-US';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "lastOnline" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "premiumSince" timestamp;