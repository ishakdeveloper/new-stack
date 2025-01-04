import { useGuildStore } from "@web/stores/useGuildStore";
import { useUserStore } from "@web/stores/useUserStore";
import { useQuery } from "@tanstack/react-query";
import { client, eden } from "@web/utils/client";

export const GUILD_PERMISSIONS = {
  ADMINISTRATOR: 1n << 0n,
  MANAGE_GUILD: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_CHANNELS: 1n << 3n,
  MANAGE_MESSAGES: 1n << 4n,
  MANAGE_NICKNAMES: 1n << 5n,
  KICK_MEMBERS: 1n << 6n,
  BAN_MEMBERS: 1n << 7n,
  CREATE_INVITES: 1n << 8n,
  SEND_MESSAGES: 1n << 9n,
  EMBED_LINKS: 1n << 10n,
  ATTACH_FILES: 1n << 11n,
  ADD_REACTIONS: 1n << 12n,
  MENTION_EVERYONE: 1n << 13n,
  VIEW_CHANNELS: 1n << 14n,
} as const;

export function usePermissions(guildId?: string) {
  const currentUser = useUserStore((state) => state.currentUser);
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const targetGuildId = guildId || currentGuildId;

  // Fetch guild data including roles and members
  const { data: guild } = useQuery({
    queryKey: ["guild", targetGuildId],
    queryFn: async () => {
      if (!targetGuildId) return null;
      return client.api.guilds({ guildId: targetGuildId }).get();
    },
    enabled: !!targetGuildId,
  });

  const hasPermission = (permission: bigint) => {
    if (!currentUser || !guild) return false;

    // Guild owner has all permissions
    if (guild.ownerId === currentUser.id) return true;

    // Get member's roles
    const member = guild.members?.find((m) => m.userId === currentUser.id);
    if (!member) return false;

    const memberRoles =
      guild.roles?.filter((role) => member.roleIds?.includes(role.id)) ?? [];

    const permissions = memberRoles.reduce((perms, role) => {
      return perms | BigInt(role.permissions);
    }, BigInt(0));

    // Check for administrator permission
    if (
      (permissions & GUILD_PERMISSIONS.ADMINISTRATOR) ===
      GUILD_PERMISSIONS.ADMINISTRATOR
    ) {
      return true;
    }

    // Check for specific permission
    return (permissions & permission) === permission;
  };

  return {
    hasPermission,
    GUILD_PERMISSIONS,
  };
}
