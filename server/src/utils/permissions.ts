// Define permission flags as constants
export const GUILD_PERMISSIONS = {
  ADMINISTRATOR: 1n << 0n, // Has all permissions
  MANAGE_GUILD: 1n << 1n, // Can manage guild settings
  MANAGE_ROLES: 1n << 2n, // Can manage roles
  MANAGE_CHANNELS: 1n << 3n, // Can create/edit/delete channels
  MANAGE_MESSAGES: 1n << 4n, // Can delete/pin messages
  MANAGE_NICKNAMES: 1n << 5n, // Can change other members' nicknames
  KICK_MEMBERS: 1n << 6n, // Can kick members
  BAN_MEMBERS: 1n << 7n, // Can ban members
  CREATE_INVITES: 1n << 8n, // Can create invite links
  SEND_MESSAGES: 1n << 9n, // Can send messages
  EMBED_LINKS: 1n << 10n, // Can embed links in messages
  ATTACH_FILES: 1n << 11n, // Can attach files
  ADD_REACTIONS: 1n << 12n, // Can add reactions
  MENTION_EVERYONE: 1n << 13n, // Can mention @everyone
  VIEW_CHANNELS: 1n << 14n, // Can view channels
} as const;

export function hasPermission(
  memberPermissions: bigint,
  requiredPermission: bigint
): boolean {
  // Administrator has all permissions
  if (
    (memberPermissions & GUILD_PERMISSIONS.ADMINISTRATOR) ===
    GUILD_PERMISSIONS.ADMINISTRATOR
  ) {
    return true;
  }
  return (memberPermissions & requiredPermission) === requiredPermission;
}

export function calculateMemberPermissions(
  memberRoles: { permissions: string }[]
): bigint {
  return memberRoles.reduce((permissions, role) => {
    return permissions | BigInt(role.permissions);
  }, BigInt(0));
}

export function parsePermissionString(permissionString: string): bigint {
  return BigInt(permissionString);
}

export function stringifyPermissions(permissions: bigint): string {
  return permissions.toString();
}
