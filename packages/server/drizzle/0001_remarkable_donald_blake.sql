ALTER TABLE "messages" ALTER COLUMN "roomId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "room_users" ALTER COLUMN "roomId" SET DATA TYPE uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
