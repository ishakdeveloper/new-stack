ALTER TABLE "categories" DROP CONSTRAINT "categories_guildId_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_categoryId_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "dm_channel_users" DROP CONSTRAINT "dm_channel_users_channelId_dm_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "guild_invite_links" DROP CONSTRAINT "guild_invite_links_guildId_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "guild_members" DROP CONSTRAINT "guild_members_guildId_guilds_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_link_usages" DROP CONSTRAINT "invite_link_usages_inviteLinkId_guild_invite_links_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_channelId_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_dmChannelId_dm_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_guildId_guilds_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_guildId_guilds_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dm_channel_users" ADD CONSTRAINT "dm_channel_users_channelId_dm_channels_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."dm_channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_invite_links" ADD CONSTRAINT "guild_invite_links_guildId_guilds_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guildId_guilds_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invite_link_usages" ADD CONSTRAINT "invite_link_usages_inviteLinkId_guild_invite_links_id_fk" FOREIGN KEY ("inviteLinkId") REFERENCES "public"."guild_invite_links"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_channelId_channels_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_dmChannelId_dm_channels_id_fk" FOREIGN KEY ("dmChannelId") REFERENCES "public"."dm_channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_guildId_guilds_id_fk" FOREIGN KEY ("guildId") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
