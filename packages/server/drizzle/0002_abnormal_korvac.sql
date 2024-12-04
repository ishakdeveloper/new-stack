ALTER TABLE "messages" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;