import db from "./db";
import {
  guilds,
  guildMembers,
  categories,
  channels,
  roles,
  dmChannels,
  dmChannelUsers,
  friendships,
  messages,
  guildInviteLinks,
  inviteLinkUsages,
} from "./schema";

async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // Seed Users

    console.log("Users seeded.");

    // Seed Guilds
    const guild1 = await db
      .insert(guilds)
      .values({ name: "Test Guild", ownerId: "q_MbrlQ9J8QgmJdMXFgX3" })
      .returning();
    console.log("Guild seeded:", guild1);

    // Seed Roles
    const defaultRole = await db
      .insert(roles)
      .values({ name: "Member", guildId: guild1[0].id, isDefault: true })
      .returning();
    console.log("Default role seeded:", defaultRole);

    // Seed Guild Users
    const guildUserEntries = [
      {
        guildId: guild1[0].id,
        userId: "q_MbrlQ9J8QgmJdMXFgX3",
        roleId: defaultRole[0].id,
      },
      { guildId: guild1[0].id, userId: "user2", roleId: defaultRole[0].id },
      { guildId: guild1[0].id, userId: "user3", roleId: defaultRole[0].id },
    ];

    for (const guildUser of guildUserEntries) {
      await db.insert(guildMembers).values(guildUser);
    }
    console.log("Guild users seeded.");

    // Seed Categories and Channels
    const category = await db
      .insert(categories)
      .values({ name: "General", guildId: guild1[0].id })
      .returning();
    console.log("Category seeded:", category);

    const channelsEntries = [
      { name: "general", categoryId: category[0].id },
      { name: "announcements", categoryId: category[0].id },
    ];

    for (const channel of channelsEntries) {
      await db.insert(channels).values(channel);
    }
    console.log("Channels seeded.");

    // Seed DM Channels
    const dmChannel1 = await db
      .insert(dmChannels)
      .values({
        name: "Alice & Bob",
        isGroup: false,
        createdBy: "q_MbrlQ9J8QgmJdMXFgX3",
      })
      .returning();
    console.log("DM Channel seeded:", dmChannel1);

    await db.insert(dmChannelUsers).values([
      { channelId: dmChannel1[0].id, userId: "q_MbrlQ9J8QgmJdMXFgX3" },
      { channelId: dmChannel1[0].id, userId: "user2" },
    ]);
    console.log("DM channel users seeded.");

    // Seed Messages
    const messagesEntries = [
      {
        text: "Hello, Bob!",
        senderId: "q_MbrlQ9J8QgmJdMXFgX3",
        channelId: dmChannel1[0].id,
      },
      {
        text: "Hi, Alice!",
        senderId: "user2",
        channelId: dmChannel1[0].id,
      },
    ];

    for (const message of messagesEntries) {
      await db.insert(messages).values(message);
    }
    console.log("Messages seeded.");

    // Seed Friendships
    const friendshipEntries = [
      {
        requesterId: "q_MbrlQ9J8QgmJdMXFgX3",
        addresseeId: "user2",
        status: "accepted",
      },
      { requesterId: "user3", addresseeId: "user4", status: "pending" },
    ];

    for (const friendship of friendshipEntries) {
      await db.insert(friendships).values(friendship);
    }
    console.log("Friendships seeded.");

    // Seed Invite Links
    const inviteLink = await db
      .insert(guildInviteLinks)
      .values({
        guildId: guild1[0].id,
        inviterId: "q_MbrlQ9J8QgmJdMXFgX3",
        inviteCode: "INVITE123",
        maxUses: 5,
        status: "active",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      })
      .returning();
    console.log("Invite link seeded:", inviteLink);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding the database:", error);
  }
}

// Run the seed script
seedDatabase();
