import {
  hasPermission,
  calculateMemberPermissions,
} from "../utils/permissions";
import db from "../database/db";
import { roles } from "../database/schema";
import { eq } from "drizzle-orm";

export async function checkGuildPermission(
  userId: string,
  guildId: string,
  requiredPermission: bigint
) {
  // Get member's roles
  const memberRoles = await db.query.roles.findMany({
    where: eq(roles.guildId, guildId),
    columns: {
      permissions: true,
    },
  });

  const memberPermissions = calculateMemberPermissions(memberRoles);
  return hasPermission(memberPermissions, requiredPermission);
}

export const permissionMiddleware = async (context: any) => {
  const { user, params } = context;
  const { guildId } = params;

  return {
    hasPermission: async (permission: bigint) => {
      return await checkGuildPermission(user?.id ?? "", guildId, permission);
    },
  };
};
