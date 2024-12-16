export const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 10); // Generates a random 8-character alphanumeric string
};
