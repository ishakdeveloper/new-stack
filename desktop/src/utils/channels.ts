export const channels = {
  TO_MAIN: "toMain",
  FROM_MAIN: "fromMain",
} as const;

export type Channel = (typeof channels)[keyof typeof channels];
