import { useGuildStore } from "@web/stores/useGuildStore";
import { useUserStore } from "@web/stores/useUserStore";
import { useQuery } from "@tanstack/react-query";
import { client, eden } from "@web/utils/client";
import { GUILD_PERMISSIONS } from "@repo/api";

export function usePermissions(guildId?: string) {
  const currentUser = useUserStore((state) => state.currentUser);
  const currentGuildId = useGuildStore((state) => state.currentGuildId);
  const targetGuildId = guildId || currentGuildId;

  // Fetch guild data including roles and members
  const { data: guild } = eden.api
    .guilds({ guildId: targetGuildId ?? "" })
    .get.useQuery();
  // const { data: guild } = useQuery({
  //   queryKey: ["guild", targetGuildId],
  //   queryFn: async () => {
  //     if (!targetGuildId) return null;
  //     return client.api.guilds({ guildId: targetGuildId }).get();
  //   },
  //   enabled: !!targetGuildId,
  // });

  const hasPermission = (permission: bigint) => {
    if (!currentUser || !guild?.[200]) return false;

    const guildData = guild[200][200];

    // Guild owner has all permissions
    if (guildData.guild.ownerId === currentUser.id) return true;

    // Get member's roles from API response
    const member = guildData.guild.members?.find(
      (m: { userId: string }) => m.userId === currentUser.id
    );
    if (!member) return false;

    const memberRoles =
      guildData.guild.roles?.filter((role: { id: string }) =>
        member.roleIds?.includes(role.id)
      ) ?? [];

    const permissions = memberRoles.reduce(
      (perms: bigint, role: { permissions: string | number | bigint }) => {
        return perms | BigInt(role.permissions);
      },
      BigInt(0)
    );

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
